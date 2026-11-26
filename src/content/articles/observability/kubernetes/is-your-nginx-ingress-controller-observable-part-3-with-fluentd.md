---
craftId: 72100
title: How to observe your NGINX Controller with Fluentd
headline: How to observe your NGINX Controller with Fluentd
subline: The NGINX Ingress controller provides a bridge between Kubernetes services and external ones. Exporting logs and metrics from this solution can give you a deeper insight into the health of your microservices.
date: 2022-02-01T11:48:00Z
author: giulia-di-pietro
topics:
  - kubernetes
  - fluent-bit
  - prometheus
  - fluentd
  - observability
  - nginx-controller
image:
  src: ~/assets/images/ingress_nginx_3.png
  title: How to produce Prometheus metrics out of Logs using Fluentd
  alt: null
youtube: https://www.youtube.com/watch?v=fiqnLA2Qr98
related:
  - observability/kubernetes/how-to-observe-your-nginx-controller-with-loki
  - observability/prometheus/how-to-observe-your-nginx-controller-with-prometheus
  - observability/kubernetes/how-to-collect-kubernetes-events
  - observability/kubernetes/collect-metrics-in-kubernetes-cluster
goDeeper:
  - text: View the tutorial on observing NGINX with FluentD on GitHub
    url: https://github.com/isItObservable/Loki-Ngninx-Logql/blob/master/part3.md
seo:
  description: Read this blog post to learn how to produce Prometheus metrics out of Logs using Fluentd and how to build a logs stream pipeline exposing metrics with Fluentd.
jsonLd:
  - "@context": https://schema.org
    "@type": FAQPage
    mainEntity:
      - "@type": Question
        name: What is the purpose of observing the NGINX Ingress Controller?
        acceptedAnswer:
          "@type": Answer
          text: Observing the NGINX Ingress Controller helps gain insights into the health and performance of microservices by exporting logs and metrics. This enables better monitoring, troubleshooting, and optimization of Kubernetes environments.
      - "@type": Question
        name: How does Fluentd help in observing the NGINX Ingress Controller?
        acceptedAnswer:
          "@type": Answer
          text: Fluentd is used to build a log stream pipeline that collects and processes logs from the NGINX Ingress Controller. It can expose metrics using plugins like the Prometheus plugin, enabling observability through log-based metrics.
      - "@type": Question
        name: What kind of metadata can be added to NGINX logs for better observability?
        acceptedAnswer:
          "@type": Answer
          text: Metadata such as ingress name, namespace, target service, request time, HTTP status, and bytes sent can be added to NGINX logs. This enriched data allows for more granular analysis and metric extraction.
      - "@type": Question
        name: What are some key metrics extracted using LogQL?
        acceptedAnswer:
          "@type": Answer
          text: Key metrics include the number of HTTP requests per ingress, the amount of bytes transferred per ingress, and request processing times. These metrics are derived from enriched logs using LogQL queries.
      - "@type": Question
        name: Why is log enrichment important in observability?
        acceptedAnswer:
          "@type": Answer
          text: Log enrichment adds contextual metadata to logs, making it easier to filter, analyze, and extract meaningful metrics. This enhances the ability to monitor specific services and troubleshoot issues effectively.
---

In this series of blog posts on observing the [NGINX controller](https://www.f5.com/go/product/welcome-to-), we have already looked at collecting metrics with Prometheus and turning logs into metrics with [LogQL](https://grafana.com/docs/loki/latest/logql/). Today, we will look at building a logs stream pipeline exposing metrics with [Fluentd](https://www.fluentd.org/).

In short, we'll first quickly go over which metrics we extracted in [part 2 of this series](/observability/kubernetes/how-to-observe-your-nginx-controller-with-loki) with LogQL. And then, we will look at which plugins we need to use in our log stream pipeline, specifically the Prometheus plugin. In the end, we will jump into the tutorial.

## Extracting metrics with LogQL

As we have learned in the previous blog post and video about observing NGINX with Loki, logs are a data source that provides deeper insights into our ingress controller.

The advantage is that we could easily adjust the login format produced by our ingress controller by adding extra metadata related to our context:

- The name of the ingress

- The namespace of the ingress resource

- The target service

- ...

In the case of NGINX, you can adjust the logging format by configuring the NGINX config file (in Kubernetes, it’s the config map).

NGINX offers several variables exposing specific data :

- ```
  $bytes_sent to report number of bytes sent by the client
  ```

- ```
  $request_time to report the request process time in seconds
  ```

- ```
  $status to report the http status code
  ```

And specific variables for Kubernetes

- ```plaintext
  $resource_name
  ```

- ```
  $resource_type
  ```

- ```
  $resource_namespace
  ```

- ```
  $service
  ```

Adding an extended logging format will expose the metadata required to observe our ingress controller properly. By adding this metadata, we could utilize LogQL to parse the new metadata and create metrics with dimensions that help us split statistics based on the service, ingress, etc. That was precisely what we were looking for.

Let’s look at the metrics we were able to report in our previous episode.

We built three LogQL to extract three KPIs. First, one that reports the **number of HTTP requests per ingress.**

```text
count by (service) ( rate(
  {app="nginx-nginx-ingress",pod="nginx-nginx-ingress-7b95f794c4-kv5rb"}
    |="ingress" !="stderr"
    | pattern `<remote_addr> [<time_local>] <method> <request> <_> <status> <body_bytes_sent> <request_time> <_> <upstream_response_time> <_> <status_ingress> <resource_name> <_> <namespace_patter> <service>`
  [1m]))
```

Then we have the following to report the **amount of bytes per ingress:**

```
sum by (service) ( sum_over_time( {app="ngninx-nginx-ingress",pod="ngninx-nginx-ingress-7b95f794c4-kv5rb"}
|="ingress" !="stderr"
| pattern `<remote_addr> [<time_local>] <method> <request> <_> <status> <body_bytes_sent> <request_time> <_> <upstream_response_time> <_>  <status_ingress> <resource_name> <_> <namespace_patter> <service>`
| unwrap body_bytes_sent[1m])
)
```

And this to report the **p99 response time of the request per service:**

```
quantile_over_time(0.99,
{app="ngninx-nginx-ingress",pod="ngninx-nginx-ingress-7b95f794c4-kv5rb"}
|="ingress" !="stderr"
| pattern `<remote_addr> [<time_local>] <method> <request> <_> <status> <body_bytes_sent> <request_time> <_> <upstream_response_time> <_>  <status_ingress> <resource_name> <_> <namespace_patter> <service>`
| status<400
| unwrap request_time[1m]) by (service)
```

We can simply report the number of log streams to report the number of requests, the bytes sent to report the bytes exchanged, and lastly, the request\_time for the response time.

We can also go further by counting the status code as well.

What are the various plugins required for our log pipeline

As described in our episode [dedicated to Fluentd](/observability/kubernetes/how-to-collect-logs-with-fluentd), there are many plugins available to:

- Collect (input plugin)

- Parse

- Filter

- Forward (output plugin)

our logs.

In our case, we need to **collect logs** produced by our NGINX ingress controller.

We utilize the input plugin called “[tail](https://docs.fluentd.org/input/tail),” which will read logs from log files (container logs). Since we're only interested in logs produced by our ingress controller, we can filter by specific container logs files by using the regexp character in the path of the log file.

```
      path /var/log/containers/*nginx*.log
```

Then we need to **parse our log stream** to extract the available metadata

Fluentd has several parsers available:

- Regexp

- Apache2

- NGINX

- Syslog

- Csv

- Json

The NGINX parser supports the default logging format of NGINX. Therefore, we would need to use “expression” to specify the structure of our log:

```
        expression  /^(?<logtime>\S+)\s+(?<logtype>\S+)\s+(?<type>\w+)\s+(?<ip>\S+)\s+\[(?<time_local>[^\]]*)\]\s+(?<method>\S+)\s+(?<request>\S+)\s+(?<httpversion>\S*)\s+(?<status>\S*)\s+(?<bytes_sent>\S*)\s+(?<responsetime>\S*)\s+(?<proxy>\S*)\s+(?<upstream_responsetime>\S*)\s+(?<ressourcename>\S*)\s+(?<upstream_status>\S*)\s+(?<ingress_name>\S*)\s+(?<ressource_type>\S*)\s+(?<ressource_namesapce>\S*)\s+(?<service>\w*)/
```

The \<name> will allow us to extract and store the metadata into a new log stream key.

As the objective is to expose metrics, we probably need to specify the type of each key using types:

```
        types ip:string,time_local:string,method:string,request:string,httpversion:string,status:integer,bytes_sent:integer,responsetime:float,request_time:float,proxy:string,upstream_responsetime:float,ressourcename:string,ressource_type:string,ressource_namesapce:string,service:string
```

Once the metadata is parsed and stored in new log stream keys, we can either format our new stream to send it to any observability backend or expose the metrics collected in a Prometheus format directly by using the [Prometheus plugin](https://github.com/fluent/fluent-plugin-prometheus).

The purpose of the Prometheus Fluentd plugin is to expose a Prometheus exporter on the Fluentd agent. The *source* object will specify how to expose the Prometheus data :

- Using bind

- Port

- And metric\_path

Here’s an example

```
 <source>
       @type prometheus
       bind 0.0.0.0
       port 9914
       metrics_path /metrics
</source>
```

The Prometheus plugin also has prometheus\_monitor capability to automatically generate metrics related to your log stream pipeline. Fluentd will automatically expose :

Metrics for output

- fluentd\_output\_status\_retry\_count

- fluentd\_output\_status\_num\_errors

- fluentd\_output\_status\_emit\_count

- Fluentd\_output\_status\_retry\_wait :current retry\_wait computed from last retry time and next retry time

- fluentd\_output\_status\_emit\_records

- fluentd\_output\_status\_write\_count

- fluentd\_output\_status\_rollback\_count

- fluentd\_output\_status\_flush\_time\_count in milliseconds from fluentd v1.6.0

- fluentd\_output\_status\_slow\_flush\_count from fluentd v1.6.0

Metrics for buffer

- fluentd\_output\_status\_buffer\_total\_bytes

- fluentd\_output\_status\_buffer\_stage\_length from fluentd v1.6.0

- fluentd\_output\_status\_buffer\_stage\_byte\_size from fluentd v1.6.0

- fluentd\_output\_status\_buffer\_queue\_length

- fluentd\_output\_status\_buffer\_queue\_byte\_size from fluentd v1.6.0

- fluentd\_output\_status\_buffer\_newest\_timekey from fluentd v1.6.0

- Fluentd\_output\_status\_buffer\_oldest\_timekey from fluentd v1.6.0

- fluentd\_output\_status\_buffer\_available\_space\_ratio from fluentd v1.6.0

This plugin automatically exposes metrics related to output or buffer plugin.

If you want to report metrics related to data collected by the tail plugin, you can also use the prometheus\_tail\_monitor. This plugin will report :

- Fluentd\_tail\_file\_position :current bytes which plugin reads from the file

- Fluentd\_tail\_file\_inode :inode of the file

All those plugins are relevant if you're interested in reporting observability related to your log stream pipeline.

In our case, we're looking to expose data from our log stream.

For that, we will need to use the Prometheus plugin that could instrument metrics from our records.

```text
  @type prometheus
  <metric>
    name message_foo_counter
    type counter
    desc The total number of foo in message.
    key foo
  </metric>
</filter>
```

The \<metric> will describe the metric:

- Name: name of the metric

- Type: counter, gauge, histogram or summary (the 4 Prometheus data types)

- Desc: to add a description

- Key: to precise the key that you want to expose as a metric

Then you can specify your labels:

```text
<labels>
  label_name value
</labels>
```

For example

```text
<labels>
  Host ${hostname}
</labels>
```

The hostname is a key from our log stream.

The label object can either be positioned in the metric object or close to the Prometheus plugin. In the first case, it will describe the specific label of this metric:

```text
<metric>
  <labels>
  </labels>
</metric>
```

In the second case, it will describe the common labels of all the metrics that you’re trying to expose.

```text
Type @ prometheus
<labels>
</labels>
```

Now, let’s jump into the tutorial!

Tutorial: How to produce Prometheus metrics out of Logs using FluentD

In this tutorial, we will reuse most of the steps covered in [Part 1](/observability/prometheus/how-to-observe-your-nginx-controller-with-prometheus) and [Part 2](/observability/kubernetes/how-to-observe-your-nginx-controller-with-loki), so make sure you have :

- A Kubernetes cluster

- The NGINX ingress controller deployed

- Prometheus deployed

In this tutorial, we will:

- Customize the logging format

- Create a Docker container with the Prometheus plugin installed

- Deploy Fluentd as a demonset by using our customized Docker image

- Deploy your log stream pipeline with a Config map

- Build a Prometheus dashboard

- We will expose those new metrics in Dynatrace by simply adding the Dynatrace annotation on the Fluentd daemonset.

Here are the all-important links to the step-by-step tutorials:

- YouTube Video: [How to produce Prometheus metrics out of logs using Fluentd](https://youtu.be/fiqnLA2Qr98?t=1009)

- GitHub page: [How to observe an NGINX ingress controller](https://github.com/isItObservable/Loki-Ngninx-Logql/blob/master/part3.md)
