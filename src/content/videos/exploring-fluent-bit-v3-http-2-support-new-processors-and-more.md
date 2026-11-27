---
title: "Exploring Fluent Bit v3: HTTP/2 Support, New Processors, and More"
slug: exploring-fluent-bit-v3-http-2-support-new-processors-and-more
category: k8s
tags: [fluent-bit, kubernetes]
youtubeId: RWdXzgNpYNE
publishDate: 2024-06-03
thumbnail: ../../assets/images/fluentbit3.jpeg
description: "Let’s explore the newest features and enhancements of Fluent Bit 3.0 and how we can leverage them in our observability practices."
---

During the last KubeCon + Cloud Native Con Europe 2024 in Paris, Fluent announced the latest release of Fluent Bit: version 3. Let’s explore the newest features and enhancements and how we can leverage them in our observability practices.

This article is part of the OpenTelemetry and Kubernetes series, in which we covered much ground. If you've been following along, you may have noticed that I recently released an episode [comparing the OpenTelemetry collector against Fluent Bit v2.x](https://www.youtube.com/watch?v=zBnazXUw08U&t=112s).

In this episode, we will cover the following:

- Http/2 support

- The metrics and traces processor

- The Content\_modifier processor

- The SQL processor

To get a refresher on what Fluent Bit is and does, check out my previous [blog post](/observability/kubernetes/how-to-configure-fluent-bit-to-collect-logs-for-your-k8s-cluster) and YouTube video explaining it all: [How to configure Fluent Bit to collect logs for our K8s cluster](https://www.youtube.com/watch?v=KJlWV5-o8v0).

## Http/2 support

The most exciting announcement is the http/2 support, which can improve how we send data to Fluent Bit. This new feature allows us to send OpenTelemetry traces using gzip compression and the Prometheus remote write plugin.

It is currently only available for the input plugins, but we can expect it to also be available soon for the output plugins.

Unfortunately, if you hope to have Fluent Bit support otlp gRPC, http2 won’t resolve this. Regarding OpenTelemetry, Fluent Bit will still be limited to the OTLP HTTP protocol.

Http/2 is mainly designed to provide Fluent Bit with a new HTTP engine that supports the http/2 protocol and traditional HTTP 1.1. If you have any solutions pushing data with http/2, Fluent Bit can receive this data.

Although there are many ways to compress content with http/2, support is currently limited to gzip, the default in OpenTelemetry.

## The new processors for metrics and traces

When collecting metrics, we usually want to be able to proceed to specific processing tasks.

- Remove all the metrics that we don’t need. We have the habit of sending 100% of the metrics a component produces to the observability backend and then figuring out what we need, but this approach is far from cost-effective. Always look at the metrics produced and try to understand each one and its importance. This would be the best way to limit the metrics we store in the observability backend.

- Enrich the metrics produced to index them to a specific server, pod, service, namespace, etc. The component producing the metric often does not add the reference of the infrastructure hosting this component. Adding metadata to the host would be useful when we must drill down on a given problem and correlate. Moreover, we want to distinguish between the hosts or pods if we have several instances of this component.

- Reduce cardinality by removing labels that have a high distribution of values.

Considering the cost of storing metrics is important, as it depends on their structure. When dealing with metrics that have numerous labels, the storage cost increases exponentially with the number of labels. If your metrics have around 50 labels, it's worth considering removing unnecessary labels to reduce storage costs.

Cardinality is another significant factor affecting cost related to the distribution of values for a given label. For example, a metric with labels for "Command" and "Process ID" in a Linux environment may have fewer than 100 potential values for the "Command" label but a vast distribution of values for the "Process ID" label. This can lead to a significant increase in storage costs. If the "Process ID" label is not helpful for statistical analysis or dashboard purposes, it's best to drop that label to reduce costs.

With the introduction of the metric\_selector processor in Fluent Bit 3, it's now possible to address the absence of scrape configuration in their Prometheus input, which was previously a limitation compared to the collector.

The metric\_selector allows us to exclude metrics or only include specific metrics.

For example, let's say we have a Prometheus exporter and we want to exclude metrics with names containing scrape\*, go\*, up\*, or the metric named kepler\_process\_uncore\_joules. We can achieve this by configuring our processor in the following way:

```yaml
        - name:  prometheus_scrape
          host: kepler.kepler.svc.cluster.local
          port: 9102
          tag: metric.kepler
          processors:
            metrics:
              - name: metrics_selector
                metric_name: /scrape_/
                action: exclude
              - name: metrics_selector
                metric_name: /go_/
                action: exclude
              - name: metrics_selector
                metric_name: /up/
                action: exclude
              - name: metrics_selector
                metric_name: /kepler_process_uncore_joules/
                action: exclude
```

In this example, you can see that the metric\_name can take the full name of a regular expression, and the action can be either exclude or include.

You may be wondering how to drop labels to reduce the cardinality. The good news is that Fluent Bit v3 comes with a processor called labels, which allows you to delete labels. While this processor doesn't have all the features yet, it has the features we’re looking for and is fully operational.

So, in our previous example, if I want to drop the labels container\_id and pid, I can simply do so with:

```yaml
              - name: labels
                delete: container_id
              - name: labels
                delete: pid
```

Labels have more operations for inserting, updating, and hashing a given label. We can insert additional labels in our Fluent Bit pipeline and use the update operation to change or rename a given label.

I have attempted to use the update operation to rename a label, but the expected result has not been achieved. For example, I tried to rename "pod\_name" to "k8s.pod.name" or "container\_namespace" to "k8s.namespace.name"

```yaml
              - name: labels
                update:
                   label_name: pod_name
                   label_value: k8s.pod.name
              - name: labels
                update:
                   label_name: container_namespace
                   label_value: k8s.namespace.name
              - name: labels
                update:
                   label_name: container_name
                   label_value: k8s.container.name
              - name: labels
                update:
                   label_name: instance
                   label_value: k8s.node.name
```

As mentioned in the episode comparing Fluentbit and the collector, no processors are helping us to convert cumulative metrics into delta. Let’s keep our fingers crossed; maybe we will have it soon.

## Content\_modifier

Content\_modifier is a processor that is only compatible with logs and traces.

As the name suggests, content\_modifier is there to modify our traces or logs by:

- Inserting new keys

- Updating or upserting

- Deleting

- Renaming

- Extracting content with the help of a regular expression

- Or converting

If you paid attention to the episode introducing Fluen Bit or presenting Fluent Bit v2, Fluent Bit already had a filter plugin named modify that allowed similar operations.

So why create new plugins for similar actions? First, this processor is not limited to logs but is also compatible with traces. The other advantage of using a processor instead of a filter plugin is related to performance. When chaining processors just after receiving, there is no encoding/decoding of the stream, so we’re removing internal operations with our data in Fluent Bit.

Let's take a look at the configuration of the content modifier.

The content\_modifier has several properties:

- The action (as listed previously): insert, upsert, delete, rename, etc.

- Key to specify the key that would be modified by our action

- Context: It will help Fluentbit understand where to apply the changes. We have the attributes or the body for logs, so either the properties of our logs or the entire log line.

The concept of context is not new to us. The OpenTelemetry community uses this concept of context in the transform processor to specify the information that would be affected by our transformation.

Depending on our action, we would need to configure additional properties:

- Insert or upsert need to specify the value or rename

- Extract requires you to define the pattern for our regular expression

- Convert requires the converted type, which can be string, boolean, int, or float

For example, a simple delete:

```yaml
pipeline:
inputs:
- name: dummy
dummy: '{"key1": "123.4", "key2": "tobedeleted"}'
processors:
logs:
- name: content_modifier
context: attributes
action: delete
key: "key2"
outputs:
- name : stdout
match: '*'
format: json_lines
```

To obfuscate the sensitive data, we could use hashing. For example:

```yaml
pipeline:
inputs:
- name: dummy
dummy: '{"username": "bob", "password": "12345"}'
processors:
logs:
- name: content_modifier
action: hash
key: "password"
outputs:
- name : stdout
match: '*'
format: json_lines
```

And we will probably use a powerful function to extract:

```yaml
pipeline:
inputs:
- name: dummy
dummy: '{"http.url": "https://fluentbit.io/docs?q=ex..."}'
processors:
logs:
- name: content_modifier
action: extract
key: "http.url"
pattern: ^(?<http_protocol>https?):\/\/(?<http_domain>[^\/\?]+)(?<http_path>\/[^?]*)?(?:\?(?<http_query_params>.*))?
outputs:
- name : stdout
match: '*'
format: json_lines
```

## The SQL Language

When SQL was announced in Fluent Bit v3, I initially thought it wasn't new. I remembered that Fluent Bit v2 already had the concept of stream processing, which could be enabled in the configuration and used to apply queries for content extraction or running aggregation queries.

However, stream processing and SQL processing are quite different. Stream processing occurs after the filter plugins, whereas SQL processing is applied on the same thread as our input or output plugins.

The SQL processor is an innovative feature that will likely revolutionize our logging pipeline design. When using this processor, there's no need to add extra storage. Fluent Bit runs the queries on the fly against our data, referred to as the Fluent Bit stream.

One important thing to note about the SQL processor, especially for those familiar with SQL language, is that it filters our data. This means that if you plan to perform any statistics or analytics, such as counting, grouping, and more, this processor won't be able to do that, at least for now.

Think of the SQL processor more like a filter plugin. For example, if you only want to push limited properties to the backend, SQL will allow us to do that.

```yaml
processors:
  logs:
    - name: sql
      query: "SELECT k8s.cluster.name, k8s.namespace.name,k8s.pod.name,content FROM STREAM;"
```

Another great use case is using SQL processors to limit the logs to a specific backend.

Let's say I want to send all the logs from the namespace "hipster-shop" to Loki, the logs for "otel" to Elastic, and everything else to Dynatrace. SQL will help me route the logs properly.

For example:

```text
- name: opentelemetry
  host: ${DT_ENDPOINT_HOST}
  port: 443
  match: "kube.*"
  metrics_uri: /api/v2/otlp/v1/metrics
  traces_uri: /api/v2/otlp/v1/traces
  logs_uri: /api/v2/otlp/v1/logs
  log_response_payload: true
  tls: On
  tls.verify: Off
  header:
    - Authorization Api-Token ${DT_API_TOKEN}
    - Content-type application/x-protobuf
- name: elastic
  …
  processors:
    logs:
      - name: sql
        query: "SELECT * FROM STREAM where k8s.namespace.name='otel-demo';"
- name: loki
  …
  processors:
    logs:
      - name: sql
        query: "SELECT * FROM STREAM where k8s.namespace.name='hipster-shop';"
```

Using SQL helps avoid modifying and removing unnecessary fields, resulting in lighter pipelines. So, big thumbs up to the fluent community for this plugin. I just hope that it will also support traces!

## Conclusion

In wrapping up this exploration of Fluent Bit v3's new capabilities, we've delved into some groundbreaking features that promise to elevate the efficiency and precision of our data processing—namely, the introduction of HTTP/2 support and the enhancement of metric and trace processing capabilities. These advancements optimize how we handle data and significantly reduce overhead costs by allowing for more targeted metric storage and processing.

I strongly encourage you to watch [the full video on this update](https://dt-url.net/FluentBitV3) for a more in-depth look at these features and to see them in action. Subscribe to stay updated on the latest insights and tutorials in this series, and join us on this journey to unlock Fluent Bit v3's full potential and beyond.

To learn more about best practices with Fluent Bit v3, read my guest article for Dynatrace, [Best practices for Fluent Bit 3.0](https://www.dynatrace.com/news/blog/best-practices-for-fluent-bit-3-0/).

## Go deeper

- [View the Fluent Bit V3 Tutorial on GitHub](https://dt-url.net/fluent-bit-3-tutorial)
