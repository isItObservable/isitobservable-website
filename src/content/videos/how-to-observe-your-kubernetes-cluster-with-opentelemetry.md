---
title: "How to observe your Kubernetes cluster with OpenTelemetry"
slug: how-to-observe-your-kubernetes-cluster-with-opentelemetry
category: otel
tags: [opentelemetry, traces, metrics, kubernetes, observability]
youtubeId: NTsK_0t9eRU
publishDate: 2022-08-18
thumbnail: ../../assets/images/otel_collector_k8s.png
description: "The OpenTelemetry Collector helps you process measurements and forward them to your preferred observability backend. Let’s see how to use it to observe K8s."
---

On the Is It Observable blog and YouTube channel, we have already covered [OpenTelemetry several times](https://isitobservable.io/search?q=OpenTelemetry). However, until now, we hadn’t focused on observing Kubernetes clusters with OpenTelemetry, particularly with the OpenTelemetry Collector.

In today’s blog post, I'll start by introducing the OpenTelemetry Collector and the components from core and contrib. Then, I’ll give you an overview of the receivers and processors that are useful for observing a [Kubernetes](https://www.dynatrace.com/news/blog/what-is-kubernetes-2/) cluster. Finally, we will move on to the tutorial so you can try it out in practice.

## What is the OpenTelemetry Collector?

[OpenTelemetry](https://www.dynatrace.com/news/blog/what-is-opentelemetry-2/) is a standard that helps you create measurements from your application. It supports several observability signals, like traces, metrics, and logs.

OpenTelemetry is composed of two main components:

- The instrumentation library

- The Collector

The Collector helps you process measurements and forward them to your preferred observability backend. It’s not a mandatory component, but it may be required to process OpenTelemetry logs in the future. (Read more details about OpenTelemetry in our [short guide](/open-telemetry/traces/a-short-guide-to-opentelemetry).)

As already explained in our [short guide](/open-telemetry/traces/a-short-guide-to-opentelemetry) to OpenTelemetry, the Collector can be deployed in several ways:

- Agent - The Collector instance running with the application on the same host ( sidecar container, daemonset ...etc.)

- Gateway - One or more Collectors instances running as standalone services per cluster, datacert, and region.

It’s recommended to deploy it in agent mode to collect local measurements and use several Collectors to forward your measurements to your observability solutions.

The Collector helps you keep your code agnostic. You'll only import standard OpenTelemetry libraries in your code and do all the vendor transformation and export using the Collector.

The Collector requires you to build a pipeline for each signal (traces, metrics, logs, etc.)

Like the agent log Collector, the Collector pipeline is a sequence of tasks starting with a receiver, then a processing sequence, and then the last sequence to forward the measurements with the exporter sequence.

The OpenTelemetry Collector also provides extensions. They're generally used for implementing components that can be added to the Collector but don't require direct access to telemetry data.

Each pipeline step comprises an operator that’s part of the Collector core or from the contrib repository. In the end, you'll use the operator provided by the release of the Collector.

Every plugin supports one or more signals, so make sure that the one you’d like to use supports traces, metrics, or logs.

### Designing a pipeline

Designing your pipeline is very simple. First, you need to declare your various receivers, processors, and exporters, as follows:

```yaml
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:55680
          http:
            endpoint: 0.0.0.0:55681
    exporters:
      otlphttp:
        endpoint: "TENANTURL_TOREPLACE/api/v2/otlp"
        headers: {"Authorization": "Api-Token DT_API_TOKEN_TO_REPLACE"}
      logging:
        loglevel: debug
        sampling_initial: 5
        sampling_thereafter: 200
```

In this example, we only define one receiver, OTLP, and two exporters, OTLP/HTTP and logging.

Then, you need to define the actual flow of each signal pipeline:

```yaml
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: []
          exporters: [otlphttp,logging]
```

## The core components of the OpenTelemetry Collector

The [core components of the OpenTelemetry Collector](https://github.com/open-telemetry/opentelemetry-collector) include a few plugins that help you build your pipeline. The contrib Collector includes the core features of the OpenTelemetry Collector.

## Receiver

The core Collector has only one available receiver for the data source: the standard OpenTelemetry protocol for traces, metrics, and logs.

To define your Otlp receiver, you need to define:

```yaml
receivers:
otlp:
protocols:
grpc:
Http:
```

The Collector will bind a local port on the Collector to listen for incoming data. The default port for grp is 4317, and the default port for HTTP is 4318.

The receiver has the property CORS (Cross-origin Resource Sharing). Here, we can white label the origins allowed to send requests and the allowed headers.

```yaml
receivers:
otlp:
protocols:
http:
endpoint: "localhost:4318"
cors:
allowed_origins:
- http://test.com
# Origins can have wildcards with *, use * by itself to match any origin.
- https://*.example.com
allowed_headers:
- Example-Header
max_age: 7200
```

## Processor

The core Collector also includes a few processors that modify the data before exporting it by adding attributes, batching, deleting data, etc. No processors are enabled by default in your pipeline. Every processor supports all or a few data sources (traces, logs, etc.), and the processor's order is important.

The community recommends using the following orders:

### Traces

[memory\_limiter](https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md)

*any sampling processors*

Any processor relying on sending source from Context (e.g. k8sattributes)

[batch](https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md)

*any other processors*

### Metrics

[memory\_limiter](https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md)

Any processor relying on sending source from Context (e.g. k8sattributes)

[batch](https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md)

*any other processors*

The core Collector provides only two types of operations for the processor: the batch processor and the memory limiter processor.

### Memory limiter processor

The memory limiter is a crucial component of all our pipelines of all types of data sources. It is recommended to be one of the first steps after receiving the data.

Memory limit controls how much memory is used to avoid facing out-of-memory situations. It uses both soft and hard limits.

When the memory usage exceeds the soft limit, the Collector will drop data and return the error to the previous step of the pipeline (normally the receiver).

If the memory is above the hard limit, then the processor will force the garbage Collector to free some memory. That will cause data to be dropped. When the memory drops and goes back to normal, the operation is resumed, with no data dropped and no GC.

The soft limit is calculated according to two parameters: hard limit - spike limit. This means that you can’t change it in the settings.

Some more critical parameters are:

- Check limit: (default value = 0, recommended value = 1) the time between two measurements of the memory usage.

- Limit\_mib: the maximum amount of memory in MiB. This defines the hard limit.

- Spike\_limit\_mib: (default value = 20% of limit\_mib). The maximum spike that’s expected between the measurements. The value must be less than the hard limit.

- Limit\_percentage: the hard limit defined by taking a % of the total available memory.

- Spike\_limit\_percentage

Example:

```yaml
processors:
memory_limiter:
check_interval: 1s
limit_mib: 4000
spike_limit_mib: 800
```

## Batch processor

The batch processor supports all data sources and places the data into batches. Batching is important because it compresses the data and reduces the number of outgoing connections sent.

As explained previously, the batch processor must be added to all your pipelines after any sampling processor.

The batching operator has several parameters:

Send\_batch\_size: the number of spans, metrics, and logs in a batch that would be sent to the exporter (default value = 8192)

Timeout: time duration after each data transfer (default = 200ms)

Send\_batch\_max\_size: the upper limit of the batch size (0 means no upper limit).

Example:

```yaml
processors:
  batch:
  batch/2:
    send_batch_size: 10000
    timeout: 10s
```

## Exporters

There are three default exporters in the OpenTelemetry Collector: OTLP/HTTP, OTLP/gRPC, and Logging.

### OTLP/HTTP

OTLP/HTTP has only one required parameter, the Endpoint, which is the target URL to send your data. For each signal, the Collector will add:

- /v1/traces for traces

- /v1/metrics for metrics

- And /v1/logs for logs.

There are also some optional parameters:

- Traces\_endpoint: if you want to customize the URL without having the Collector add/v1/traces, then you should use this setting

- Metrics\_endpoint

- Logs\_endpoint

- Tls: that has all the TLS configuration, i.e.:

```yaml
tls:
insecure: false
ca_file: server.crt
cert_file: client.crt
key_file: client.key
min_version: "1.1"
max_version: "1.2"
```

- Timeout: (default 30s)

- Read\_buffer\_size

- Write \_buffer\_size

By default, the Collector compresses the data in gzip format. To disable the compression, you can use “Compression: none.”

## OTLP/gRPC

OTLP/gRPC has fewer parameters: Endpoint and TLS

Grpc also compresses the content in gzip. If you want to disable it, you can add:

Compression: none

The OTLP/gRPC has support for proxy by adding the environment variables:

- HTTP \_PROXY

- HTTPS\_PROXY

- NO\_PROXY

## Logging

Logging is an operator that you'll probably use to debug your pipelines. It accepts a couple of parameters:

- Logging\_lebel: (default info)

- Sampling\_initial: number of messages initially logged each second

## Extensions

The core Collector provides two extensions: memory\_ballast and Zpages

Like the memory\_limiter, memory ballast is also a recommended extension to control the memory consumption of the Collector.

### Memory\_ballast

A memory\_ballast optimizes the number of GC triggered by your system. It increases the heap size to reduce the number of GCP cycles. By reducing the GCP cycle, we will directly reduce the CPU usage (related to the GC).

The memory\_ballast can be configured with:

- Size\_mib: corresponding to the ballast size

- Size\_in\_percentage: the ballast's memory based on the total memory available

If we're using limits in docker or k8S, then the ballast size would be:

Memeory\_limit \* size\_in\_percentage/100

For example:

```yaml
    extensions:
      memory_ballast:
        size_in_percentage: 20
```

### Zpages

Zpages is a format introduced by OpenCensus. This extension creates HTTP endpoints to provide live data for debugging different components of the Collector.

Zpage has one parameter: endpoint (default = localhost:55679). It provides a different route with different details:

- ServiceZ (http://localhost:55679/debug/servicez) gives an overview of the Collector services

- PipelineZ ([http://localhost:55679/debub/pipelinez](http://localhost:55679/debub/pipelinez)) provides details on the running pipeline defined in the Collector

- ExtensionZ provides details on the extensions

- FeatureZ shows the list of features available

- TraceZ shows the bucket size of the spans by the latency of buckets (0us, 10us, 100us, 1ms, 10ms, 100ms, 1s, 10s, 1m)

- And last, RpcZ shows statistics on remote procedure calls.

## The components from the contrib repo

The [OpenTelemetry Collector Contrib](https://github.com/open-telemetry/opentelemetry-collector-contrib) provides many plugins, but it wouldn’t be useful to describe all of them. Here, we will only look at the receivers, the exporters, and the processors.

### Receiver

Receivers are crucial because they can connect to a third-party solution and collect measurements from it.

We can almost separate the receivers into 2 categories: listening mode and polling mode. You can find a complete list here: [OpenTelemetry-collector-contrib repository](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver)

Here are some examples of receivers:

Most receivers for traces are in listening mode, for example:

- AWS X-Ray

- Google PUbSub

- Jaeger

- Etc.

For metrics, there are fewer listening plugins. Here are a few of them:

- CollectD

- Expvar

- Kafka

- OpenCencus

- Etc.

On the other side, there is a larger number of receivers working in polling mode like:

- Apache

- AWS Container Insights

- Cloud Foundry Receiver

- CouchDB

- Elasticsearch

- flinkMetrics

- Etc.

We could be interested in all the database receivers, webservers, broker technology, and OS from this list. But also kubelet, k8scluster, Prometheus, and hostmetrics.

In terms of logs, there are few operators available, mainly acting in listening mode:

- fluentForward

- Google PUbSub

- journald

- Kafka

- SignalFx

- splunkHEC

- tcplog

- udplog

And fewer acting in polling mode:

- filelog

- k8sevent

- windowsevent

- MongoDB Atlas

### Processors

The Collector Contrib provides various processors that help you modify the structure of the data with the help of attributes (adding, updating, deleting), k8sattrributes, resource detection, and resources (updating/deleting resource attributes). All those processors support all existing signals.

Then you have a specific processor for trades that helps you adjust the sampling decisions (probability sampler or tailsampling) or to group your traces (with groupbytraces). For metrics, two specific processors help you make operations: cumulative to delta and delta operator. An interesting processor exposes observability metrics related to our spans that deserve to be tested, as it could help you count the span per latency buckets: spanmetrics.

In the end, you'll probably use frequently these processors:

- Transform

- Attributes

- K8sattrributes

## Extensions

The Collector contrib provides more extensions to the Collector. We can split them into various categories:

Extensions handling the authentication mechanism to the receivers or exports

- Asapauth

- Basicauth

- Beartokenauth

- Oauth2auth

- Oidauth

- Sigv4auth

Extensions for operations

- Httphealthcheck: provides an HTTP endpoint that could be used with k8s with liveness or readiness probe

- Prof: to generate profiling out of the Collector

- Storage: storing the data's state into a DB or a file

Extensions for sampling:

- jaegerremotesampling

And then you have a very powerful extension: observer.

The observer helps you discover networked endpoints like a Kubernetes pod, Docker container, or local listening port. Other components can subscribe to an observer instance to be notified of endpoints coming and going. Observers usually use few receivers to adjust how data is collected based on incoming information.

## How to observe k8S using the Collector contrib

With all those operators, the big question is: can we observe our K8S cluster using only the Collector?

One option would be to use [Prometheus](https://www.dynatrace.com/news/blog/what-is-prometheus/) exporters and the receiver to scrape the metrics directly from them. But we don’t want to use the Prometheus exporter in our case; instead, we will try to find a way to use the Collector operator designed for Kubernetes.

Receivers collecting metrics:

- k8Scluster

- Kubelet

- Hostmetrics

Receivers collecting logs:

- Kubernetes events

A few processors:

- memory\_limiter and batch

- k8sattributes

- transform

Let’s first look at the various receivers we're going to use.

### The receivers

#### k8Scluster

[K8scluster](https://github.com/open-telemetry/OpenTelemetry-Collector-contrib/tree/main/receiver/k8sclusterreceiver) collects cluster-level metrics from the k8s API. This receiver will require you to have specific rights to collect data, and it provides a different way to handle the authentication:

- A service account (default mode) will require creating a service account with a clusterRole to read and list most of the Kubernetes objects of the cluster

- A Kubeconfig to map the kubeconfig file to be able to interact with the k8s API

The receiver has several optional parameters:

- Collection\_interval

- Node\_codition\_to\_report

- Distribution: OpenShift or Kubernetes

- Allocatable\_types\_to\_report: could specify the type of data we're interested in (CPU, memory, ephemeral storage, storage)

This plugin generates data with resource attributes, so if your observability solution is not supporting resource attributes in the metrics, make sure to convert resource attributes into labels.

#### Kubelet Stats receiver

The [Kubelet Stats receiver](https://github.com/open-telemetry/OpenTelemetry-Collector-contrib/tree/main/receiver/kubeletstatsreceiver) interacts with the kubelet API exposed on each node. To interact with kubelet you'll need to handle the authentication using TLS settings or with the help of a service account.

If using a service account, give the right list/watch rights to most of the Kubernetes objects.

Because this receiver requires the node’s information, you can utilize an environment variable in the Collector to specify the node:

```yaml
apiVersion: apps/v1
kind: Deployment
…
env:
- name: K8S_NODE_NAME
valueFrom:
fieldRef:
fieldPath: spec.nodeName
```

And then

```yaml
receivers:
  kubeletstats:
    collection_interval: 20s
    auth_type: "serviceAccount"
    endpoint: "https://${K8S_NODE_NAME}:10250"
    insecure_skip_verify: true
```

Or we could also combine it with the powerful extension “observe.” For example:

```yaml
extensions:
k8s_observer:
auth_type: serviceAccount
node: ${K8S_NODE_NAME}
observe_pods: true
observe_nodes: true
receivers:
receiver_creator:
watch_observers: [k8s_observer]
Receivers:
kubeletstats:
rule: type == "k8s.node"
config:
auth_type: serviceAccount
collection_interval: 10s
endpoint: "`endpoint`:`kubelet_endpoint_port`"
extra_metadata_labels:
- container.id
metric_groups:
- container
- pod
- node
```

In this example, the endpoint and kubelet\_endpoint\_port will be provided by the observer.

Then we could add extra metadata using the parameters extra\_metadata\_labels and metric\_group to specify which metrics should be collected. By default, it will collect metrics from containers, pods, and nodes, but you can also add volume.

To get more details on the usage of the nodes at the host level, you could also use the [Hostmetrics receiver](https://github.com/open-telemetry/OpenTelemetry-Collector-contrib/tree/main/receiver/hostmetricsreceiver).

#### Kubernetes event receiver

The [Kubernetes event receiver](https://github.com/open-telemetry/OpenTelemetry-Collector-contrib/tree/main/receiver/k8seventsreceiver) collects events from the k8s API and creates OpenTelemetry logs data. Similar to the previous receivers, you'll need specific rights and can authenticate using Kubeconfig or serviceaccount.

This receiver also offers the ability to filter the events for specific namespaces with namespaces parameter. By default, it is set to all.

### The processors

Now, let’s look at the processors we’re going to use.

#### k8Sattributes

The [K8sattributes](https://github.com/open-telemetry/OpenTelemetry-Collector-contrib/tree/main/processor/k8sattributesprocessor) processor will be used to add extra labels to our k8s data.

This processor collects information by interacting with the Kubernetes API. Therefore, similarly to the previous operator, you'll need authentication using serviceaccount or Kubeconfig.

You can specify extra labels you may want to use using the extract operator :

For example:

```yaml
      k8sattributes:
        auth_type: serviceAccount
        passthrough: false
        filter:
          node_from_env_var: K8S_NODE_NAME
        extract:
          metadata:
            - k8s.pod.name
            - k8s.pod.uid
            - k8s.deployment.name
            - k8s.namespace.name
            - k8s.node.name
            - k8s.pod.start_time
```

#### MetricTransform

The [MetricTransform](https://github.com/open-telemetry/OpenTelemetry-Collector-contrib/tree/main/processor/metricstransformprocessor) processor helps you to:

- Rename metrics

- Add labels

- Rename labels

- Delete data points

- And more.

In our case, we would use this processor to add an extra label with the cluster ID and name to all the reported metrics. This label would be crucial to help us filter/split data from several clusters.

Last, we won’t describe exporters, but you'll need to use one exporter for the produced metrics and one for the generated logs.

## Tutorial

This tutorial will show you how to use the OpenTelemetry operator to observe your Kubernetes cluster. It’s a perfect exercise to use the various receivers and processors explained previously for k8s.

For this tutorial, we will need several things:

- A Kubernetes cluster

- The Nginx ingress controller to expose our demo app and Grafana

- The OpenTelemetry operator

- The Prometheus operator (without the default exporters)

- Loki to forward our events

- Prometheus to store the metric collected

- Grafana to build a quick dashboard

We will build the right metric and log pipeline to export the metrics to Prometheus remote writer and logs to Loki.

Watch the full video tutorial on YouTube here: [OpenTelemetry Collector - How to observe K8s using OpenTelemetry](https://www.youtube.com/watch?v=NTsK_0t9eRU)

Or go directly to GitHub: [How to observe your K8s cluster using OpenTelemetry](https://github.com/isItObservable/Otel-Collector-Observek8s)

## Go deeper

- [View the tutorial on observing K8s with OpenTelemetry on GitHub](https://github.com/isItObservable/Otel-Collector-Observek8s)
