---
title: "How to observe your NGINX Controller with Loki"
slug: how-to-observe-your-nginx-controller-with-loki
category: k8s
tags: [observability, ingress-controller, nginx-controller]
youtubeId: rrPP6ITOXt8
publishDate: 2022-01-28
thumbnail: ../../assets/images/ingress_nginx_part2.png
description: "The NGINX Ingress controller provides a bridge between Kubernetes services and external ones. Let’s look at how to extend this communication's observability with Loki's help."
---

When you utilize a Prometheus exporter to observe ingress controllers, you'll notice that a few dimensions are missing, and it comes to a point that you can’t get the level of detail you want. That’s why it’s useful to implement another solution like [Loki from Grafana](https://grafana.com/oss/loki/) to extend visibility. But how do you do it?

This blog post is part of a 3-part series on observing the NGINX controller, each with its article and YouTube video.

1. [Observing with Prometheus](/observability/prometheus/how-to-observe-your-nginx-controller-with-prometheus)

2. [Observing with Loki](/observability/kubernetes/how-to-observe-your-nginx-controller-with-loki)

3. [Observing with Fluentd](/observability/kubernetes/is-your-nginx-ingress-controller-observable-part-3-with-fluentd)

In this article, we will focus on observing the NGINX Controller with Loki by looking first at how to collect the logs and turn them into metrics (with the help of Loki's main contributor [Cyril Tovena from Grafana](https://x.com/kuqd)) and then how to create your own LogQL.

## Collecting logs and turning them into metrics

When you utilize a Prometheus exporter to observe ingress controllers, you'll notice that a few dimensions are missing, and you can’t get the level of detail you want. That’s why it’s a good idea also to utilize Loki to extend our visibility on our ingress controller.

A key part of the journey from logs to metrics is setting up an agent like Promtail, which ships the contents of the logs to a Grafana Loki instance. The logs are then parsed and turned into metrics using LogQL.

As Cyril explains in the video, Loki and Promtail were developed to create a solution like Prometheus for logs. Promtail was developed right at the start and it has the same service discovery and configuration as Prometheus. You can use other agents instead of Promtail, but it’s easier to use Promtail if you already know how to use Prometheus. You can just copy-paste the config, and you're set.

Loki is very useful for the NGINX use case because ingress controllers don't provide a lot of metrics. However, they can produce a lot of logs, and they have a lot more details than metrics. With LogQL, you would parse those logs and create your matrix to get the information you want.

The first step is to use your index to find all the logs (**label filter**), with which you can decide how many logs you'll query. I.e., if you want to query a full namespace, then use the “namespace key”; if you want a specific application, use both the application and the namespace keys.

It’s better to reduce the number of logs you’re going to pass at the beginning and scan as much as possible. For this, you'll need some preparation (**line filter**), which filters the logs based on a word. There are two types of filters: **regexp** and **contain**. Cyril recommends using multiple contains together and regexp only if you really need to. Contains are faster, and you can filter more at the beginning, ensuring that the last operation at the end will be faster.

Before you parse logs, you need to ensure they're in the right format. There are two ways you can do this:

- Discard all logs that aren’t in a JSON format.

- Select a log screen that has only the specific format you require.

And finally, we have **parsing**, where you add more labels for aggregation or filtering to the log line.

So, to summarize:

Logs are ingested with Promtail. You build a LogQL that filters for the label related to the NGINX controller and parse the log stream to match the NGNIX log structure. The parser will help us extract new labels and then unwrap labels to expose the right metrics.

Another recommendation is to avoid parsing logs too much at the source and do it in Loki instead. Loki has four parsers, two of which depend on the format (json or logfmt). The other two depend on pattern or regexp. The pattern parser is easier to use than the regexp one, and it’s also faster and consumes fewer resources.

Now that we know what the process looks like let’s jump into how to build a LogQL.

## How to build a LogQL

LogQL stands for Log Query Language, and, similarly to what PromQL is for Prometheus, it’s the query language for logs. If you're using an observability backend solution supporting LogQL, it’s crucial to understand what you can achieve with it.

Everything starts with a log stream pipeline that collects logs from various sources and stores them into a logstream storage solution like Loki.

Once the log streams are stored, then we want to be able to consume and transform the collected data to build dashboards or alerts for your project.

LogQL allows you to filter, transform, and extract data as metrics. Once you have metrics, you will be able to use any functions from PromQL to aggregate them. After applying a filter and metric, it can also return a log stream.

LogQL is composed of a {Stream selector} and a log pipeline where each step of your pipeline is separated by a vertical bar - |.

![LogQL](~/assets/images/logql.png)

### The log agent collector

When collecting logs, our log agent collector adds context to our log stream like the pod name, the service name, etc. So the log stream selector allows us to filter our logs based on the labels available in our log stream.

Similar to PromQL, we can filter by using label matching operators like:

- \= exactly equal

- != not equal

- \=~ regexp matches

- !~ regexp does not match

### The log pipeline

The log pipeline helps you process and filter the logs stream with the help of label matching operators. It can be composed of:

- Line filter

- Parser

- Label filter

- Line format

- Labels format

- Unwrap ( for metrics)

Let’s see them one by one

#### Line filter

The line filter is similar to a grep applied over the aggregated logs. It will search the content of the log line. Here are the operators:

- |=: Log line contains string

- !=: Log line does not contain string

- |~: Log line contains a match to the regular expression

- !~: Log line does not contain a match to the regular expression

Here’s an example in which we're only interested in logs that have an error:

```
{container="frontend"} |= "error"
{cluster="us-central-1"} |= "error" != "timeout"
```

#### Parser expression

The parser expression can parse our log stream and extract labels from the log content using different functions:

- JSON

- Logfmt

- Parser

- Unpack

- Regexpp

Building upon the previous example:

```
{container="frontend"} |= "error" | JSON
```

The log stream is in JSON format:

```
{
"pod.name"= { "id:"deded"}, 
namespace:"test"
}
```

If I apply the JSON parser, as a result of that all those JSON attributes will be exposed as new labels in our transformed log stream, which will look like this:

- ```
  pod_name_id = "deded"
  ```

- ```
  namespace=test
  ```

You can also specify a parameter to JSON to specify which labels you would like to extract to avoid getting everything.

Logfmt will extract all keys and values from the logfmt format line.

```text
at=info method=GET path=/
host=mutelight.org
fwd="123.443.21.212"
status=200 bytes=1653
```

Will turn into

- At = “info”

- method = GET

- path = /

- host = mutelight.org

#### Pattern parser

The pattern is a powerful parser tool that allows you to explicitly extract fields from the log lines.

For example, we have this log stream:

```
192.176.12.1[10/Jun/2021:09:14:29 +0000] "GET /api/plugins/versioncheck HTTP/1.1" 200 2 "-" "Go-http-client/2.0" "13.76.247.102, 34.120.177.193" "TLSv1.2" "US" ""
```

This log line can be parsed with the following expression:

```
<ip> - - <_> "<method> <uri> <_>" <status> <size> <_> "<agent>" <_>
```

Using \<\_> shows that you're not interested in keeping a specific label.

#### Regexp parser

Regexp is similar to the pattern, but you can specify the expected format utilizing your regexp regular expression.

#### Label filter

Once you have parsed your log stream and extracted and added new labels, you will be able to apply new label filtering.

After my previous expression:

```
{container="frontend"} |= "error" | JSON
```

I can add:

```
{container="frontend"} 
|= "error" 
| JSON
| duration > 1m and 
bytes_consumed > 20MB
```

That shows that I’m interested in a specific duration and amount of bytes consumed.

#### Line Format Expression

The line format expression helps you rewrite your log content by displaying only a few labels:

```
{container="frontend"}
| logfmt 
| line_format "{{.ip}} 
{{.status}} 
{{div .duration 1000}}"
```

#### Labels Format Expression

The label format can rename, modify and even add labels to our modified log stream. Then we can use Metric Queries to extract log streams and metrics from our log.

### Metric queries

Metrics queries apply a function to log query results and return a range vector.

There are two types of aggregators:

- Log range aggregation

- Unwrapped range aggregation

#### Log range aggregation

Similarly to Prometheus, a range aggregation is a query followed by a duration. Here are some of the supported functions:

- **rate(log-range):** calculates the number of entries per second

- **count\_over\_time(log-range):** counts the entries for each log stream within the given range.

- **bytes\_rate(log-range):** calculates the number of bytes per second for each stream.

- **bytes\_over\_time(log-range):** counts the amount of bytes used by each log stream for a given range.

- **absent\_over\_time(log-range):** returns an empty vector if the range vector passed to it has any elements and a 1-element vector with the value 1 if the range vector passed to it has no elements. (absent\_over\_time is useful for alerting when no time series and logs stream exist for label combination for a certain amount of time.)

Example

```text
sum by (host) (
  rate(
    {job="mysql"}
      |= "error" != "timeout"
      | json
      | duration > 10s
    [1m])
)
```

In this example, we're defining a split by the host and only interested in the jobs related to MySQL, errors but not timeouts. We parse it to add new labels using JSON, and lastly, we're doing label filtering where we're only looking at durations above 10 seconds.

#### Unwrap range aggregations

Unwrap will specify which labels will be used to expose the metrics. Here are some of the supported functions for operating over unwrapped ranges:

- **rate(unwrapped-range):** calculates per second rate of all values in the specified interval.

- **sum\_over\_time(unwrapped-range):** the sum of all values in the specified interval.

- **avg\_over\_time(unwrapped-range):** the average value of all points in the specified interval.

- **max\_over\_time(unwrapped-range):** the maximum value of all points in the specified interval.

- **min\_over\_time(unwrapped-range):** the minimum value of all points in the specified interval

- **first\_over\_time(unwrapped-range):** the first value of all points in the specified interval

- **last\_over\_time(unwrapped-range):** the last value of all points in the specified interval

- **stdvar\_over\_time(unwrapped-range):** the population standard variance of the values in the specified interval.

- **stddev\_over\_time(unwrapped-range):** the population standard deviation of the values in the specified interval.

- **quantile\_over\_time(scalar,unwrapped-range):** the φ-quantile (0 ≤ φ ≤ 1) of the values in the specified interval.

- **absent\_over\_time(unwrapped-range)**

Example

```text
quantile_over_time(0.99,
  {cluster="ops-tools1",container="ingress-nginx"}
    | json
    | __error__ = ""
    | unwrap request_time [1m])) by (path)
```

In this example, we want the percentile of 99. We're filtering only on the specific label of ops-tools1, and we also add another filter for the container. Then we parse it with JSON and use \_\_error\_\_ to remove potential errors. Lastly, we unwrap request\_time above 1m.

## Tutorial

Now that we’ve learned how to use Loki to observe the NGINX controller and how a LogQL works, let’s dive into the practical tutorial!

Here are some step-by-step tutorials on YouTube and GitHub. Just follow the links below:

- YouTube video: [Is NGINX Ingress Controller observable? Part 2](https://www.youtube.com/watch?v=rrPP6ITOXt8&t=2612s)

- GitHub page: [How to observe a Nginx ingress controller with Loki](https://github.com/isItObservable/Loki-Ngninx-Logql)

Also, check out this content by Grafana to learn more about Loki, as recommended by Cyril:

- [How to create fast queries with Loki’s LogQL to filter terabytes of logs in seconds](https://grafana.com/blog/2020/12/08/how-to-create-fast-queries-with-lokis-logql-to-filter-terabytes-of-logs-in-seconds/)

- [Why Grafana Loki is easier to use and operate than ever before](https://grafana.com/go/observabilitycon/2021/easy-to-use-loki/)

Thanks again, Cyril, for coming on my YouTube channel and sharing many insights about Loki! I hope to see you again soon for a future video.

## Go deeper

- [View the tutorial on observing NGINX with Loki](https://github.com/isItObservable/Loki-Ngninx-Logql/blob/master/part2.md)
