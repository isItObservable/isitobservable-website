---
craftId: 271007
title: Fluent Bit v2 the Telemetry Agent
subline: Fluent Bit is an open source, lightweight data processor and forwarder for Linux, BSD, and OSX. It allows you to collect data/logs from different sources, unify, and send them to multiple destinations.
date: 2023-06-26T16:23:00Z
author: henrik-rexed
topics:
  - fluent-bit
  - opentelemetry
  - traces
  - metrics
  - observability
image:
  src: ~/assets/images/fluentbitv2_2.png
  title: Fluent Bit - The Telemetry Agent
  alt: null
youtube: https://youtu.be/nZqR0h8P5cU
related:
  - open-telemetry/how-to-observe-your-kubernetes-cluster-with-opentelemetry
  - observability/kubernetes/how-to-configure-fluent-bit-to-collect-logs-for-your-k8s-cluster
goDeeper:
  - text: View the tutorial on Fluent Bit V2 on GitHub
    url: https://github.com/isItObservable/fluentbitv2
seo:
  description: Learn more about Fluent Bit, the open source, lightweight data processor and forwarder for Linux, BSD, and OSX, which allows you to collect data/logs from different sources
jsonLd:
  - "@context": https://schema.org
    "@type": FAQPage
    mainEntity:
      - "@type": Question
        name: What is Fluent Bit?
        acceptedAnswer:
          "@type": Answer
          text: Fluent Bit is an open-source, lightweight data processor and forwarder for Linux, BSD, and OSX. It allows you to collect data/logs from different sources, unify, and send them to multiple destinations.
      - "@type": Question
        name: What are the latest updates to Fluent Bit?
        acceptedAnswer:
          "@type": Answer
          text: The latest updates to Fluent Bit include support for metrics and traces, stream processing capabilities, and enhanced deployment options for Kubernetes environments.
      - "@type": Question
        name: How does Fluent Bit differ from the OpenTelemetry Collector?
        acceptedAnswer:
          "@type": Answer
          text: Fluent Bit is primarily focused on log collection, parsing, and forwarding, while the OpenTelemetry Collector is designed to handle logs, metrics, and traces, providing a more comprehensive observability solution.
      - "@type": Question
        name: What platforms does Fluent Bit support?
        acceptedAnswer:
          "@type": Answer
          text: Fluent Bit supports various platforms including Windows, Linux, Mac, Docker, and Kubernetes.
      - "@type": Question
        name: How can Fluent Bit be deployed in a Kubernetes environment?
        acceptedAnswer:
          "@type": Answer
          text: Fluent Bit can be deployed in Kubernetes using a Daemonset and a ConfigMap that holds your pipeline configuration. Alternatively, the Fluent community has developed an operator to facilitate deployment and manage pipeline updates.
      - "@type": Question
        name: What is the power of Fluent Bit's tag-based pipeline system?
        acceptedAnswer:
          "@type": Answer
          text: Fluent Bit's tag-based pipeline system allows each input source to be tagged, helping route logs to the correct parser, filter, or output plugin using the match parameter.
---

This episode and blog post of Is It Observable is focusing on a CNCF project we’ve already talked about Fluentbit. The first episode was on [How to configure Fluent Bit to collect logs for your K8s cluster](/observability/kubernetes/how-to-configure-fluent-bit-to-collect-logs-for-your-k8s-cluster). This time I’ll focus on:

- Latest updates to Fluent Bit

- Stream processing

- Difference between Open Telemetry Collector and Fluent Bit

- Interview with Eduardo Silva, founder of the maintainer of the Fluent Bit project

- Hands-on tutorial

If you are looking for an Agent collecting logs, metrics, traces, transform your data and send it to the observability backend of your choice, then this episode is for you!

## Fluent Bit – an essential tool for Kubernetes logging

[Last time I talked about Fluent Bit](/observability/kubernetes/how-to-configure-fluent-bit-to-collect-logs-for-your-k8s-cluster), it was only supporting logs, while metrics and traces were out of its scope. Since then, Fluentbit has evolved to the most popular log agent collector in the market. While its mighty sibling Fluentd, is widely used for heavy-duty tasks on bare metal technology and complex log processing, Fluent Bit's rise has been due to its lightweight nature and ability to work seamlessly with modern containerized environments such as Kubernetes (k8s).

A Fluent Bit agent collects, parses, and forwards our logs based on a pipeline that we define, which is essentially the configuration file of the Fluent Bit agent. The pipeline configuration can perform a series of operations:

- Collection of data using input plugins

- Parsing the content with parsing plugins

- Filtering or modifying the data with filter plugins

- Exporting the data using output plugins

Fluent Bit is extremely versatile in terms of deployment. It works with various platforms including Windows, Linux, Mac, Docker, and of course, Kubernetes. When deployed in a Kubernetes environment, Fluentbit can be set up traditionally using a Daemonset and a ConfigMap that holds your pipeline. Alternatively, the Fluent community has developed an operator to facilitate deployment and manage pipeline updates.

The widespread use of Fluent Bit extends to cloud providers as well, with many using it to collect logs from clusters and forward them to their log viewer or storage solutions.

Fluentbit operates by managing our data in a specific format, such as:

```json
{
  "log": "some message",
  "stream": "stdout",
  "labels": {
    "color": "blue",
    "unset": null,
    "project": {
      "env": "production"
    }
  }
}
```

This format allows us to access our data using a record accessor, like \`$log\` for the log field, or \`$labels\['name of the label'\]\`.

Fluentbit's power lies in its tag-based pipeline system. Each input source can be tagged, helping us route our logs to the correct parser, filter, or output plugin using the match parameter. For example:

```yaml
    [INPUT]
       Name tail
       Path  /var/log/containers/*.log
       multiline.parser docker, cri
       Tag kube.*
       Mem_Buf_Limit 5MB
       Skip_Long_Lines On
    [FILTER]
       Name kubernetes
       Match kube.*
       Merge_Log On
       Keep_Log Off
       K8S-Logging.Parser    On
       K8S-Logging.Exclude On
```

This setup allows us to build complex pipelines where we can apply a specific parser or filter to a specific type of data.

Fluent Bit is not just about logs anymore. The community has expanded its capabilities to support other signals like metrics and traces. This broadened observability is largely due to Fluentbit's integration with OpenTelemetry, which provides a standardized schema for structuring telemetry data. This standard format, a JSON payload with various properties, is something Fluentbit excels at parsing.

In summary, Fluent Bit has not only become a critical tool for managing logs in Kubernetes clusters but also a vital player in the observability landscape. Its ability to collect, parse, and route logs based on a flexible and configurable pipeline makes it an indispensable tool for modern infrastructure.

## Fluent Bit's latest update: Unveiling new features and improvements

The Fluent Bit community has been hard at work, bringing us major improvements and exciting new features in the latest update. Let's dive in and see what's new.

### The YAML configuration

Traditionally, designing a pipeline in Fluent Bit requires a specific format and schema. However, Fluent Bit now introduces a new way of defining our pipeline through a YAML structure, currently in preview mode. The YAML structure offers three distinct sections:

- Env: Variable definitions

- Services: Configuration of global properties of the agent

- Pipeline: Primary components of our pipeline ( inputs, Filters, Outputs)

Here's an example of how the new configuration looks:

```yaml
service:
flush: 5
daemon: off
log_level: debug
pipeline:
inputs:
- name: cpu
tag: my_cpu
outputs:
- name: stdout
match: 'my*cpu'
```

### Backpressure

While not a new feature, it's worth mentioning Fluent Bit's backpressure feature. This feature controls the memory usage on the agents and prevents out of memory situations due to high memory consumption from processing and filtering large amounts of data. Fluent Bit achieves this by pausing the input plugin until the data has been pushed, ensuring smooth data flow while managing memory efficiently.

### The Fluent Bit monitoring

Fluent Bit exposes default metrics on the port 2020 of the agents. These metrics are accessible in various HTTP endpoints:

- /api/v1/uptime producing a json object with the uptime information

- /api/v1/ùmetrics producing in json format internal metrics of our various plugins used in our pipeline.

- /api/v1/metrics/prometheus production the same data but in a prometheus format

- /api/v1/health to report the health check results

The metrics are produced in a Prometheus format and are described in the Fluent bt documentation: [Monitoring - Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/administration/monitoring)

- The number of bytes collected by the input plugins

- The number of records collected by our input plugin

- The number of data dropped by our output plugins

- The number of errors reported by our output plugins

- The number of bytes and records sent by the output plugins

- The number of records that was retried by our output plugins

- The number of records where retries failed

Each of these metrics also includes labels to split on a given plugin.

### Expect filter plugin

The new 'Expect' filter plugin allows us to validate that our data is structured as expected. By adding an 'Expect' filter after each plugin that modifies our data structure, we can ensure that our data is processed correctly before moving to the next step in our pipeline.

For example, we may want to add validation between each step: Tail -> grep -> record\_modifier -> output

For example:

```
# First 'expect' filter to validate that our data was structured properly
[FILTER]
name expect
match *
key_exists color
key_exists $label['name']
action exit
```

### The new inputs plugins collecting metrics

```
With Fluent Bit's recent support for metrics and traces, we can expect numerous new output and input plugins. Note that as of now metrics or traces collected are running through a separate pipelines from logs and won't go through filters plugins.
Input plugins collecting metrics:
```

- Fluentbit metrics. This plugin exposes the Fluent Bit metrics to report the health of our internal pipeline steps. These metrics can then be sent to an output plugin supporting metrics.

- Health is a plugin to enable health checks on the agent.

Plugins related to exporters

- Nginx exporter metric scraps metrics from the nginx status page. If you are using nginx plus you can even interact with the REST API of your Nginx instance to collect more details.

- Node exporter metrics is based on the prometheus node exporter to collect system host metrics on cpu/disc and network process usage

- Prometheus Scrape metrics let you determine the host, port and path of our Prometheus exporter. Fluent Bit will then scrape the metrics every x seconds (defined with the time interval parameter).

- StatsD is an input plugin enabling Fluent Bit to receive metrics using the statds protocol.

- Windows exporter metrics based on the prometheus windows exporter to collect host /system metrics of a windows server.

Last, the most exciting news is the support of OpenTelemetry with the opentelemetry plugin.

Fluenbit will by default listen for otlp http data on tcp port 4318 and automatically expose new endpoints on the agent:

- /v1/traces to receive traces

- /v1/metrics to receive metrics

- /v1/logs ofr otel logs.

One important point is that if you are exporting your traces the data will be compressed using gzip. Therefore, you won’t be able to see the data except if you are using the parameter

*Raw\_traces.* Then Fluent Bit will only be a passthrough to your output plugin.

If you want to use a filter plugin, you will have to send the data from your otel application or collector with compression disabled. For example in the case of the usage of the collector:

```yaml
otlphttp:
  endpoint: http://fluent-bit.fluenbit.svc...
  compression: none
  tls:
    insecure: true
```

### The filter plugins

When designing your Fluent Bit pipeline, filter plugins can be powerful tools, particularly the "Standard Output" and "Rewrite Tag" plugins.

**The Standard Output plugin** is an excellent utility for debugging your pipeline. This plugin prints the data passing through it, allowing you to examine the results of any parsers or other filter plugins applied to your data. For instance, you could modify your data using a filter plugin like "Modify Record", then use the "Standard Output" plugin to display the modified data. This simple yet effective debugging technique ensures that your data manipulation steps are working as intended.

**The Rewrite Tag plugin** is one of the most useful plugins to manage and route your data through the pipeline. Tags, defined at the data source directly from our input plugins, play a crucial role in data routing. However, there are instances when we need to change the tag after the data has been received and modified. That's precisely where "Rewrite Tag" comes into play.

The "Rewrite Tag" plugin works by defining a rule that matches our data content using regular expressions. It then creates a new record with a new tag. The rule parameter structure comprises "Key", "Regexp", "New\_tag", and "Keep".

- "Key" creates a rule based on an attribute present in our data.

- "Regexp" checks whether our specific key matches a regular expression.

- "New\_tag" uses regular expressions to dynamically create our tag based on the content of our data.

- "Keep" decides whether the original data will be preserved and continue through the pipeline. If set to true, we will have two records with two different tags progressing in the pipeline. If false, the initial record will be dropped

Here's an example of how to use the "Rewrite Tag" plugin:

```
[INPUT]
NAME dummy
Dummy {"tool": "fluent", "sub": {"s1": {"s2": "bit"}}}
Tag test_tag
[FILTER]
Name rewrite_tag
Match test_tag
Rule $tool ^(fluent)$ from.$TAG.new.$tool.$sub['s1']['s2'].out false
Emitter_Name re_emitted
[OUTPUT]
Name stdout
Match from.*
```

### The output plugins

The latest update also brings new output plugins related to metrics and traces support. These include:

- Prometheus remote write to write directly in prometheus

- Prometheus exporter where Fluent Bit becomes a prometheus exporter

- Official openserach output plugin

- OpenTelemetry to send metric, logs, and traces.

### Stream processing

Fluent Bit offers stream processing capabilities that enable real-time data analysis on top of its existing log collection, parsing, and filtering features. Generally, data processing is performed once the data is stored in the observability backend of your choice, such as Grafana's LogQL or Dynatrace's DQL.

However, there may be instances when you want to conduct real-time analysis on your data to report KPIs for alerting or SLI/SLO purposes.

The stream processor is an independent process that checks for records that have reached the storage layer: Input -> Parser -> Filter -> Storage -> Router -> Output

It is triggered from the storage layer, allowing you to execute stream tasks that involve running SQL-like queries against Fluent Bit streams. These queries are called "stream tasks", and Fluent Bit uses SQL language to query and create new streams from your data:

```
CREATE STREAM stream_name
[WITH (property_name=value, [...])]
AS select_statement
```

This syntax is combined with a SELECT statement:

```
CREATE STREAM hello AS SELECT * FROM TAG:'apache.*';
```

This example creates a new stream named "hello" containing all logs with the "apache.\*" tag.

The SQL language also supports aggregation functions, such as:

- Avg

- Min

- Max

- Count

- Sum

For example, you could create a stream with:

```
CREATE STREAM hello AS SELECT *,count() FROM TAG:'apache.*' method="POST" and status=200 GROUP by url;
```

Additionally, you can add properties to the stream, such as a tag:

```
CREATE STREAM hello WITH ( tag=test) AS SELECT *,count() FROM TAG:'apache.*' method="POST" and status=200 GROUP by url;
```

## Comparing Fluent Bit and OpenTelemetry Collector

If Fluent Bit can handle traces and metrics in a similar fashion to logs, one might wonder how it differs from the OpenTelemetry (OTel) collector. At present, it isn't a fair comparison because Fluent Bit's filters are primarily designed for logs, meaning it acts more like a passthrough for metrics and traces. However, we anticipate that Fluent Bit will soon have filters capable of manipulating traces and metrics by dropping or adding extra data.

The OTel Collector, a component of OpenTelemetry, shares some similarities with Fluent Bit, but there are also key differences. In the OTel Collector, input plugins are known as receivers, filter plugins are processors, and output plugins are exporters.

The OTel Collector offers a wide array of receivers, processors, and exporters to handle data from every telemetry signal supported by the OpenTelemetry project. This means it can receive traces from OTel, Zipkin, metrics from different operating systems, logs from systems, and then process this data. The collector also provides numerous processors to enrich or modify telemetry data, including processors that add Kubernetes attributes and adjust the sampling decision of traces, among other functions.

At this time, the OTel Collector offers more plugins to modify metrics and traces than Fluent Bit. Still, with the ongoing efforts of the Fluent community, this gap is expected to narrow.

One significant difference lies in pipeline design. Unlike Fluent Bit, the OTel Collector doesn't use the concept of 'tag' for applying specific filters/processors to a source. Instead, it recently introduced 'connectors' that serve as receivers and exporters, allowing the processing of a source and sending it to the connector.

[https://github.com/open-telemetry/opentelemetry-collector/blob/main/connector/README.md](https://github.com/open-telemetry/opentelemetry-collector/blob/main/connector/README.md)

The connector can then act as the receiver for another pipeline, enriching or adjusting the data before sending it to the backend. While the collector doesn't use the 'tag' concept, the connector feature can almost replicate it. However, the collector currently lacks a filter similar to Fluent Bit's that ensures data matches a specific format.

Thus, the design experience is quite different between the two. The 'tag' concept in Fluent Bit offers a more complex pipeline design and data routing based on these tags. In contrast, the collector differentiates pipelines for each data type (metrics, traces, logs, or others), allowing specific flow control for each source.

One intriguing aspect is the new YAML-based pipeline design in Fluent Bit, bringing it closer to the collector's design format. This development allows for precise input, filter, and output definitions for data processing.

While the collector is currently better equipped for modifying traces and metrics, patience will be required to achieve similar capabilities with Fluent Bit. The silver lining is that Fluent Bit can reduce workload in clusters if used solely as a collector's gateway. It can collect logs from pods, receive traces and metrics, and then export to the appropriate backend, which is an exciting prospect.

Tutorial

In this tutorial, we will use Fluent Bit to collect

- Logs of our cluster

- Metrics from kube state metrics and node exporter

- Traces produced by the Otel demo application

- Logs of our cluster

- Metrics from kube state metrics and node exporter

- Traces produced by the Otel demo application

and we will Configure the pipeline to send the metrics, logs and traces to Dynatrace

For this tutorial we will need:

- a Kubernetes cluster

- Nginx ingress controller to expose our application

- Prometheus operator

- OpenTelemetry operator to create a simple collector pipeline deployed as sidecar, and that will receive the produced traces and metrics and forward them to fluentbit

- Fluent Bit

- a Dynatrace tenant

Watch the full tutorial on my YouTube channel: [Fluent v2, the Telemetry Agent](https://youtu.be/nZqR0h8P5cU)

Or follow the steps in GitHub: [Fluentbit v2](https://github.com/isItObservable/fluentbitv2)
