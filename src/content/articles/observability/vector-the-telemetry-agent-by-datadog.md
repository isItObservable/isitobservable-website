---
craftId: 298055
title: "Vector: the Telemetry Agent by DataDog"
subline: What is the difference between Vector and other agents? In this blog post, we’ll find out together.
date: 2024-06-17T08:34:00Z
author: giulia-di-pietro
topics:
  - vector
  - kubernetes
  - metrics
  - traces
  - logs
image:
  src: ~/assets/images/vectorthumbnail.jpeg
  title: "Vector Unveiled: Exploring Datadog’s Open Source Observability Agent"
  alt: null
youtube: https://www.youtube.com/watch?v=yyxCSOGTtGk
related:
  - open-telemetry/fluent-bit-v2-the-telemetry-agent
  - observability/kubernetes/exploring-fluent-bit-v3-http-2-support-new-processors-and-more
---

What is the difference between Vector and other agents? In this blog post, we’ll find out together.

This article is part of the OpenTelemetry and Kubernetes series, where we’ve already covered many tools and agents. After releasing the [episode comparing Fluent Bit against the Collector](https://youtu.be/zBnazXUw08U), several community members contacted me, asking me to consider comparing those agents with Vector.

So today, I’ll focus on presenting [Vector](https://vector.dev/) by looking at its various features and plugins. I’ll also take advantage of working on a Vector to run a few tests to compare it with Fluent Bit or the Collector. This blog post accompanies the video already released on the [Is It Observable? YouTube channel](https://youtube.com/@isitobservable), which you can watch here: [Vector Unveiled: Exploring Datadog’s Open Source Observability Agent](https://youtu.be/yyxCSOGTtGk).

In summary, we’ll discuss the following:

- What Vector is

- The design experience

- The receivers for logs and metrics

- The transform plugins

- The Vector Remap language

- Sinks

- The observability data provided by Vector

- A comparison with the OpenTelemetry Collector and Fluent Bit

## What is Vector?

Vector is an open source agent developed by Datadog to collect logs and metrics. It is comparable to other agents such as Fluent Bit, Stanza, and Promtail. However, Vector is built in Rust, which suggests that its resource usage may be more efficient. It’s important to note that Vector doesn’t support traces; only metrics, logs, and events.

Vector’s processing capabilities are interesting, especially when using its transform language, VRL (Vector Remap Language). Another advantage, which will be discussed in another section, is the rich observability data provided by Vector.

Like all agents, Vector provides its data model for logs and metrics. All collected data will be structured according to this model. Therefore, it is crucial to understand this schema when building a Vector pipeline to apply the right changes to your data.

For logs, you would have a format like this:

```text
{ timestamp: ""
  message: "The actual log line
```

Then, each attribute will be added to the JSON payload.

For metrics:

```text
{
  Name :
  Tags: { all the labels of a given metric)
  The type of metric counter, gauge, histograms: { value}
  timestamp
}
```

Once you understand the data, you can start processing logs, events, or metrics with Vector.

Vector, like other observability agents on the market, can be deployed in various environments, including bare-metal (Linux, Windows, and Mac), Docker, and, of course, Kubernetes.

Deployment Options:

- **Agent Mode**: Deployed on the same host as your application in a bare-metal environment. In Kubernetes, agent mode means deploying as a DaemonSet to read all the logs from your cluster.

- **Aggregator Mode**: Similar to the gateway deployment of other agents. In Kubernetes, this could be a StatefulSet or a simple stateless deployment, receiving data to push to your final destination.

Typically, observability setups involve chaining multiple agents for simplicity and ownership reasons. Project teams may deploy their own agents for minor transformations, while a central observability team manages more significant agents. This approach splits the ownership of the pipeline files.

**Configuration**: Vector relies on a configuration file, structuring the pipeline into specific steps:

1. **Sources**: Determine what you’ll collect (equivalent to "input" in Fluent Bit and "receivers" in Otel collector).

2. **Transforms**: Process your data (equivalent to "parser" and "filter" in Fluent Bit and "processors" in Otel collector).

3. **Sinks**: Define where you want to send the data (equivalent to "output" in Fluent Bit and "exporters" in Otel collector).

Each step and plugin in the pipeline runs in separate threads, similar to other agents like Fluent Bit and the Otel collector.

Vector has two additional interesting features:

1. **Hot Reload Support**: Similar to Fluent Bit, simplifying maintenance.

2. **API**: Exposes health and GraphQL endpoints.

Vector’s flexible deployment and comprehensive feature set make it a robust choice for observability, though it could improve by fully supporting OpenTelemetry.

### OpenTelemetry support in Vector

Vector can perform most tasks expected from observability agents, but its support for OpenTelemetry needs improvement.

While Vector has an OpenTelemetry source to receive logs in the OpenTelemetry format, it lacks support for metrics. The biggest disappointment lies in its inability to export logs or metrics using OpenTelemetry. Instead, it relies on specific extensions for each backend you plan to use. In today's landscape, with OpenTelemetry becoming the de facto standard for telemetry data, it's reasonable to expect full support from leading observability solutions.

If Vector supported an OpenTelemetry sink, it could export to any solution in the market. The absence of this feature was surprising, especially given OpenTelemetry's prominence. Additionally, the Vector community has raised issues requesting OpenTelemetry support, but there has been little progress.

## The design logic of Vector

The pipeline experience of Vector is a bit similar to Fluent Bit.

It has three design possible formats: YAML, JSON file, and TOML.

TOML is closer to the old Fluent Bit design experience.

```
[sources.apache_logs]
type = "file"
include = ["/var/log/apache2/*.log"] # supports globbing
ignore_older_secs = 86400 # 1 day
# Structure and parse via Vector's Remap Language
[transforms.apache_parser]
inputs = ["apache_logs"]
type = "remap"
source = '''
. = parse_apache_log(.message)
```

So, the type of \[ type of plugin. The ID of your plugin \]

Then, type to define which plugin you would use and after all the properties of the plugin.

It also provides a YAML format:

```yaml
# Ingest data by tailing one or more files
sources:
  apache_logs:
    type: "file"
    include:
      - "/var/log/apache2/*.log" # supports globbing
    ignore_older_secs: 86400 # 1 day

# Structure and parse via Vector's Remap Language
transforms:
  apache_parser:
    inputs:
      - "apache_logs"
    type: "remap"
    source: ". = parse_apache_log(.message)"

  # Sample the data to save on cost
  apache_sampler:
    inputs:
      - "apache_parser"
    type: "sample"
    rate: 2 # only keep 50% (1/`rate`)

# Send structured data to a short-term storage
sinks:
  es_cluster:
    inputs:
      - "apache_sampler" # only take sampled data
    type: "elasticsearch"
    endpoints:
      - "http://79.12.221.222:9200"
    bulk:
      index: "vector-%Y-%m-%d" # daily indices
```

So, there is a source, transform, and sinks section.

Each plugin has a property named inputs, which refers to the plugin’s ID that will send data to a given plugin.

In Fluent Bit, this logic relies on tags, and the plugin will threaten each plugin's use of tags to match with data. In Vector, his logic of inputs reminds me a lot of Stanza's design experience. You define the flow of your pipeline through inputs.

For example, if I want to collect logs from Kubernetes, do some transformation, and then send it to Dynatrace, I’ll define the following flow:

```yaml
sources:
  kubernetes_logs:
    type: kubernetes_logs
transforms:
  remap_logs:
    type: remap
    inputs:
      - kubernetes_logs
    source: |
      .k8s.pod.name=del(.kubernetes.pod_name)
      .k8s.namespace.name=del(.kubernetes.pod_namespace)
      .k8s.container.name=del(.kubernetes.container_name)
      .content=.message
      .k8s.node.name=del(.kubernetes.pod_node_name)
      structured=parse_regex!(.kubernetes.pod_owner,r'^(?P<workloadkind>\w+)/(?P<workloadname>\w+)')
      . = merge(., structured)
      .dt.kubernetes.workload.kind= downcase(to_string(.workloadkind))
      .dt.kubernetes.workload.name= downcase(to_string(.workloadname))
      fileparse=parse_regex!(.file,r'^.*\/(?P<namespace>[^_]+)_(?P<pod_name>[^_]+)_(?P<uid>[a-f0-9\-]{36})\/(?P<container_name>[^\._]+)\/(?P<restart_count>\d+)\.log$')
      .= merge(.,fileparse)
      .k8s.pod.uid=.uid
      .k8s.cluster.uid="$CLUSTERID"
      del(.workloadkind)
      del(.workloadname)
      del(.kubernetes)
  throttle:
    type: throttle
    inputs:
      - remap_logs
sinks:
  dynatrace_logs:
    type: http
    inputs:
      - throttle
    compression: none
    batch:
      max_events: 800
    encoding:
      codec: json
    uri: $DT_ENDPOINT/api/v2/logs/ingest
    method: post
    request:
      headers:
        Authorization: "Api-Token $DT_API_TOKEN"
        Content-type: "application/json; charset=utf-8"
```

Another fantastic thing about Vector is the design experience. The CLI has validation options that can control whether your pipeline has any syntax issues. Later, you’ll see that Vector provides a playground to help you test your complex VRL scripts.

## The sources of metrics and logs

Vector provides a comprehensive set of plugins for each step. Given its nature, you can expect all the necessary plugins to receive metrics and logs from the most common sources:

**Log Sources**:

- Traditional file reading

- Kubernetes logs for collecting logs from your k8s node

- Fluent for receiving logs from a fluent agent

- Syslog, Vector protocol, Socket (TCP/UDP), Docker logs

- Kafka, Splunk, Logstash, Journald, Heroku, and OpenTelemetry

Vector also includes specific plugins for cloud providers like AWS S3, WAS, SQS, and AWS Kinesis Firehose.

Two particularly interesting plugins are:

- DNStap: For collecting logs from the DNStap server.

- Exec Plugin: Allows you to run shell commands on the agent's host and collect the output as logs.

**Metric Sources:**

- Traditional Prometheus support (remote write or scrape)

- StatsD

- Specific metric plugins for Nginx, Apache, PostgreSQL, MongoDB, AWS ECS metrics, Event StoreDB metrics, and a host metric plugin for local system metrics.

While Vector does not currently support OpenTelemetry for metrics, it does support events from metrics and logs, effectively treating them as logs.

**Event Sources**: AMQP, GCP Pub/Sub, HTTP client, Apache Pulsar, and Redis

Like Fluent Bit, Vector offers specific plugins to collect metrics and logs from your Vector agent, named internal metrics and internal logs.

For your Kubernetes use case, the main plugins of interest are Kubernetes logs and Prometheus scrape.

### Kubernetes logs

Kubernetes logs are by far the most straightforward source in Vector. The challenge lies more with the deployment requirements. Typically, you will deploy Kubernetes logs to Vector in agent mode within a cluster, running it as a daemonset. Additionally, you need to mount /var/logs/pods to Vector to read the logs from the node.

Kubernetes logs offer several options:

- Filter-specific file name

- Namespace selector

- Node selector

- Label selector.

This setup requires the appropriate RBAC permissions to list and get pods and namespaces from your cluster.

This plugin is particularly exciting because it reads the logs and adds the necessary Kubernetes metadata. Your logs will include a Kubernetes object containing the Kubernetes metadata, labels, and pods' annotations. Therefore, there is no need to enrich this step during your transformation.

### Prometheus scrape

Another plugin you would likely use is Prometheus Scrape. This plugin provides an experience similar to Fluent Bit, where you can list the endpoints you plan to scrape. You need to define the exact path to your exporter: htttp://\<servername>:\<port>/metrics

It also includes options to manage authentication if your exporters require it.

However, I was a bit disappointed that you can’t reuse a scrape config or even define a relabeling configuration directly at the plugin level. But it’s not a big issue because Vector has the suitable transforms to process your metrics properly.

### Transform in Vector

When processing logs and metrics, you expect to have specific plugins that can help you with filtering your data, parsing your logs to extract additional details, reducing the cardinality of metrics by removing labels or dropping unnecessary metrics, and batching the data to prevent API rate limits when exporting your data with throttling.

Vector has limited plugins, but they meet all your needs. Even better, it has a few plugins that help you control the volumes of data with aggregation and cardinality limitations. The same goes for logs, where you can reduce the collapse of multiple logs in a single log stream and sample events based on specific conditions.

We have plugins that transform a log into a metric or, the opposite, transform a metric into a log.

In Vector, the remap and filter plugins can answer your needs. Those two plugins rely on the Vector Remap Langage, which has many use cases for processing your logs and metrics.

## Vector Remap language

VRL is a programming language dedicated to processing logs and metrics performantly. A few transform plugins, namely remap, routing, and filter, currently rely on VRL.

The critical aspect of VRL is that it will deal with your data as a JSON payload, and it will provide several functions that help you to:

- Add new metadata

- Delete keys with del

- Remove a record with remove

- Parse and there are various parsing functions

- Convert

- Decode/encode

- Encrypt or decrypt data

Similar to any programming language, you can create logic using if, if then else, for, etc.

VRL also includes a set of error codes that help you understand why your code has specific issues, helping you build more reliable VRL scripts. In a parsing issue, you can get the error code and react based on the error returned. You can find all the error codes in [the VRL documentation](https://vector.dev/docs/reference/vrl/errors/).

When using VRL, you’ll utilize the data from your pipeline. As explained previously, the logs and metrics are a JSON payload.

For example, to create a field content with the value of a message, I can simply create the following instructions:

.content = .message

If the message was a JSON object, I could do .content = .message.textmessage, for example, to get the value of the texmessage property.

It is not a complicated language. In contrast to OTTL, you can create variables in your VRL script, making maintenance much more manageable.

It also has all the suitable functions to parse text and JSON or predefined functions to parse Apache, Nginx, Syslog, and more.

Let’s say I want to enrich my K8s logs using the metadata provided by default by the kubernes\_logs source:

```yaml
        .k8s.pod.name=del(.kubernetes.pod_name)
        .k8s.namespace.name=del(.kubernetes.pod_namespace)
        .k8s.container.name=del(.kubernetes.container_name)
        .content=.message
        .k8s.node.name=del(.kubernetes.pod_node_name)
        structured=parse_regex!(.kubernetes.pod_owner,r'^(?P<workloadkind>\w+)/(?P<workloadname>\w+)')
        . = merge(., structured)
        .dt.kubernetes.workload.kind= downcase(to_string(.workloadkind))
        .dt.kubernetes.workload.name= downcase(to_string(.workloadname))
         fileparse=parse_regex!(.file,r'^.*\/(?P<namespace>[^_]+)_(?P<pod_name>[^_]+)_(?P<uid>[a-f0-9\-]{36})\/(?P<container_name>[^\._]+)\/(?P<restart_count>\d+)\.log$')
        .= merge(.,fileparse)
        .k8s.pod.uid=.uid
        .k8s.cluster.uid="$CLUSTERID"
        del(.workloadkind)
        del(.workloadname)
        del(.kubernetes)
```

This will rename the various K8s metadata with the standard naming convention.

It will extract the workload kind and name from the pod\_owner files and set the values in new attributes: dt.kubernetes.workload.kind and dt.workload.name.

This also uses regex\_parsing to parse the file name to extract the pod uid.

VRL is not only limited to logs, but you can also reduce cardinality by dropping labels with VRL.

For example:

```yaml
        if  exists(.tags.pid) {
          del(.tags.pid)
        }
        if  exists(.tags.container_id) {
             del(.tags.container_id)
        }
```

Here, the container\_id and pid will be deleted from the metrics if the labels exist in this metric.

The other thing I love about VRL is that Vector provides a [playground for testing and debuting VRL scripts](https://playground.vrl.dev/), which is missing from OpenTelemetry.

## Sinks

Regarding destination, Vector unsurprisingly supports various options for sending logs, events, and metrics to DataDog. But it also has other destinations, like HTTP, NewRelic, Honeycomb, Prometheus, AWS logs, and more.

However, as mentioned in the introduction, it is very disappointing that Vector doesn’t provide the OpenTelemetry sink. This prevents users from sending metrics and logs to any observability backend on the market using the open standard.

## Observability

One area where Vector excels is observability. It has two internal sources: internal\_metrics and internal\_logs.

**Internal Logs**: These logs integrate the agent's logs into the Vector pipeline, enabling you to track potential data collection or export errors and determine the root cause of these errors.

**Internal Metrics**: Vector provides an impressive array of metrics. While I won't detail each one, it's important to highlight a few key aspects:

- Record Tracking: You can easily monitor the number of records flowing in and out at each step and, more specifically, through each plugin.

- Buffer Behavior: Metrics indicating each plugin's buffer behavior help you avoid memory pressure events.

- CPU Utilization: Vector also provides a utilization metric that shows CPU load per plugin. This allows you to identify where most of your CPU resources are used and which parts of your pipeline are most resource-intensive. This insight is incredibly powerful for optimizing performance.
