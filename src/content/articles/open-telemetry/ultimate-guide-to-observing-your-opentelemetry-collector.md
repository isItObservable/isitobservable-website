---
craftId: 326131
title: Ultimate Guide to Observing Your OpenTelemetry Collector
subline: Is the OpenTelemetry Collector observable?
date: 2024-09-04T07:00:00Z
author: giulia-di-pietro
topics:
  - observability
  - opentelemetry
  - kubernetes
image:
  src: ~/assets/images/otelobservability.jpg
  title: Ultimate Guide to Observing Your OpenTelemetry Collector
  alt: null
youtube: https://www.youtube.com/watch?v=2-JQFWOZOoM
related:
  - open-telemetry/traces/a-short-guide-to-opentelemetry
  - open-telemetry/what-is-the-opentelemetry-operator
  - open-telemetry/traces/mastering-nginx-instrumentation-with-opentelemetry
  - open-telemetry/traces/how-to-instrument-your-code-using-opentelemetry
  - open-telemetry/how-to-observe-your-kubernetes-cluster-with-opentelemetry
goDeeper:
  - text: View the tutorial on OTel collector observability on GitHub
    url: https://github.com/isItObservable/collector-observability
---

In today’s episode, we’re tackling a crucial question: **Is the OpenTelemetry Collector observable?** Given that we’re working with the leading observability project, it’s only fair to expect it to provide the right observability data.

Here’s what you’ll learn:

- A quick refresher on the essentials for diagnosing collector issues

- How to enable metric and log collection with the default collector version

- An in-depth look at the feature flag that extends observability, including the new settings you can use

Let’s get started!

## What do you need to understand a collector issue?

When operating an [OpenTelemetry](/open-telemetry) collector, it’s surprising how often projects overlook adding the right observability to their collector. Using an OpenTelemetry collector means collecting observability data to transport it to your chosen observability backend. This data is crucial for SREs, platform engineers, and anyone involved during an application crash. Imagine business personas using this data to monitor business metrics as well.

Many critical roles and tasks in your organization depend on the health of your collector. No data will be sent to your observability backend if the collector crashes. So, what should we focus on?

Just like any critical application, we need to report:

- **Resource usage**: CPU, memory, and potential CPU throttling

- **Garbage collector behavior**: Since it’s a Go component, monitoring the GC is essential

- **Pipeline issues**: Scrape config, transform, or exporting issues. If data is rejected from the backend, logs are the perfect signal

We can use our collector to report these signals back to our backend using:

- **Host receiver**: For bare-metal deployments, this receiver reports the resource usage of the server hosting the collector

- **Kubernetes**: Use the k8scluster receiver and kubelet stats to report the health of your workload. If you have the Prometheus operator, use kubestate metrics and the node exporter and scrape the resource details with the Prometheus receiver.

In case of a collector pipeline failure, the collector generates logs. To gather these logs, use the file log receiver to read the collector’s logs. This applies to bare-metal and Kubernetes deployments; just add the right volumes to read /var/log/pods.

The GC details are also crucial, and the metrics produced by the collector natively generate these details.

With this, you have the minimum KPIs to understand the collector's runtime health. But we also need to figure out what’s happening in the pipeline: How much data is coming in, how many metrics, traces, and logs are there, how many have been processed, and how much data has been exported?

I recommend creating two KPIs related to the number of records exported versus the number of records received. This ratio helps us understand the percentage of data processed and if any data is lost during transformation. It’s normal to drop data, so create the ratio, follow the pipeline, and adjust targets based on sampling decisions or log/metric filtering.

Another important KPI is tracking the quantity of data exported from the collector versus the amount received by the backend. This should be 100%. If not, it indicates a communication issue or backend data rejection.

The community recommends using two processors in your pipeline: **memory\_limiter** and **batch**.

- **Memory\_limiter**: This step controls memory usage within your pipeline to avoid out-of-memory situations. It should be the first step in your processor pipeline

- **Batch**: Creates an observability record before exporting it and compresses the records, optimizing network communication with the observability backend.

A critical aspect of the memory limiter is the soft and hard limit. If memory reaches the soft limit, memory\_limiter will refuse data. Track the metrics, logs, and traces dropped in the processor to identify when memory settings are reached.

Data is exported every x seconds, meaning the collector has a queue to store signals before exporting them. This is useful if there’s a communication issue, as the exporter will retry sending the data. Track the queue’s usage with the KPIs **exporter\_queue\_size** and **exporter\_capacity**. Create a ratio with these metrics to see the queue’s usage percentage.

Lastly, keep track of the signals that receivers have refused. This helps track potential data loss between internal components and the collector.

To report the actual health of our pipeline, we need to collect internal collector metrics.

## How do we enable metrics and log collection?

To enable metrics and log collection, follow these steps.

### Enabling metrics collection

First, enable telemetry to allow the metrics produced by your collector. Add the following settings in the service section:

```yaml
telemetry:
  metrics:
    address: ${MY_POD_IP}:8888
```

This configuration exposes Prometheus metrics on port 8888.

Next, collect these metrics from your pipeline using the Prometheus receiver:

```yaml
prometheus:
  config:
    scrape_configs:
      - job_name: opentelemetry-collector
        scrape_interval: 5s
        static_configs:
          - targets:
              - ${MY_POD_IP}:8888
```

A metric pipeline will manage those metrics. You can enrich the data by adding Kubernetes metadata, dropping a few metrics, and converting them to delta. Here’s an example:

```yaml
        metrics:
          receivers: [otlp,prometheus]
          processors: [memory_limiter,transform/metrics,filter,k8sattributes,transform,cumulativetodelta,batch]
          exporters: [otlphttp]
```

This setup sends the collector's internal metrics, including GC metrics and data refused or dropped.

### Enabling log collection

For logs, collect your collector’s logs using the file log receiver:

```yaml
      filelog:
        include:
          - /var/log/pods/*/*/*.log
        start_at: beginning
        include_file_path: true
        include_file_name: false
        operators:
          # Find out which format is used by kubernetes
          - type: router
            id: get-format
            routes:
              - output: parser-docker
                expr: 'body matches "^\\{"'
              - output: parser-crio
                expr: 'body matches "^[^ Z]+ "'
              - output: parser-containerd
                expr: 'body matches "^[^ Z]+Z"'
          # Parse CRI-O format
          - type: regex_parser
            id: parser-crio
            regex: '^(?P<time>[^ Z]+) (?P<stream>stdout|stderr) (?P<logtag>[^ ]*) ?(?P<log>.*)$'
            output: extract_metadata_from_filepath
            timestamp:
              parse_from: attributes.time
              layout_type: gotime
              layout: '2006-01-02T15:04:05.999999999Z07:00'
          # Parse CRI-Containerd format
          - type: regex_parser
            id: parser-containerd
            regex: '^(?P<time>[^ ^Z]+Z) (?P<stream>stdout|stderr) (?P<logtag>[^ ]*) ?(?P<log>.*)$'
            output: extract_metadata_from_filepath
            timestamp:
              parse_from: attributes.time
              layout: '%Y-%m-%dT%H:%M:%S.%LZ'
          # Parse Docker format
          - type: json_parser
            id: parser-docker
            output: extract_metadata_from_filepath
            timestamp:
              parse_from: attributes.time
              layout: '%Y-%m-%dT%H:%M:%S.%LZ'
          - type: move
            from: attributes.log
            to: body
          # Extract metadata from file path
          - type: regex_parser
            id: extract_metadata_from_filepath
            regex: '^.*\/(?P<namespace>[^_]+)_(?P<pod_name>[^_]+)_(?P<uid>[a-f0-9\-]{36})\/(?P<container_name>[^\._]+)\/(?P<restart_count>\d+)\.log$'
            parse_from: attributes["log.file.path"]
            cache:
              size: 128  # default maximum amount of Pods per Node is 110
          # Rename attributes
          - type: move
            from: attributes.stream
            to: attributes["log.iostream"]
          - type: move
            from: attributes.container_name
            to: resource["k8s.container.name"]
          - type: move
            from: attributes.namespace
            to: resource["k8s.namespace.name"]
          - type: move
            from: attributes.pod_name
            to: resource["k8s.pod.name"]
          - type: move
            from: attributes.restart_count
            to: resource["k8s.container.restart_count"]
          - type: move
            from: attributes.uid
            to: resource["k8s.pod.uid"]
```

This configuration reads the logs and extracts metadata from the file path. Each cluster log is stored in /var/log/pods and includes metadata like namespace and pod name. Mount this volume to your collector and run it in DaemonSet to collect the logs.

## The Observability feature flags of the collector

The OpenTelemetry community has been hard at work enhancing the telemetry section. While enabling internal metrics is a great start, scraping these metrics for your backend is still necessary. Recent releases (around version 0.90, though the exact version might vary) have introduced more configuration options for telemetry objects, including the exciting ability to generate traces from the collector pipeline. This feature lets you track the time spent on each processor, which is a game-changer!

To take advantage of this feature, you need to enable it, as it is turned off by default. Add the following argument to your collector deployment:

```yaml
  args:
    feature-gates: "telemetry.useOtelWithSDKConfigurationForInternalTelemetry"
```

Once enabled, configure your collector to generate the necessary data. Similar to enabling Prometheus metrics, add the telemetry object in the service section to support both metric and trace settings:

```yaml
service:
  telemetry:
    metrics:
      readers:
        - periodic:
            interval: 5000
            exporter:
              otlp:
                protocol: http/protobuf
                endpoint: http://localhost:4318
                headers:
                  api-key: !!str 1234
                insecure: true
                temporality_preference: delta
    traces:
      processors:
        - batch:
            exporter:
              otlp:
                protocol: grpc/protobuf
                endpoint: https://backend2:4317
```

The telemetry configuration for traces and metrics follows many of the concepts from OTL metrics:

- **Metrics**: Define the interval between each metric with the period setting and specify the exporter. For example, using OTLP with HTTP/protobuf or gRPC/protobuf protocols, setting the endpoint, headers, and temporality preferences (delta or cumulative)

- **Traces**: Like metrics, configure the exporter under the batch processor.

The automatic export of collector logs from the telemetry object isn’t covered. This is related to the coverage of OTLP logs for Go. However, you can still collect the collector’s logs using the file log receiver.

When you look at the traces produced, you’ll see one trace per export (logs, traces, and metrics). Each step of the pipeline is represented as a span event, which might be hard to visualize but could improve in future releases.

![OTLP logs for Go Distributed traces events](~/assets/images/trace.png)

### Example GitHub Repo

I’ve prepared a [GitHub repository](https://github.com/isItObservable/collector-observability) with code examples and collector pipelines with telemetry enabled. This includes a dashboard example that reports the collector’s health and parses logs to identify metrics dropped by the observability backend. This helps adjust the pipeline to process or drop metrics as needed.
