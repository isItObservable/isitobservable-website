---
title: "How to build a PromQL (Prometheus Query Language)"
slug: how-to-build-a-promql-prometheus-query-language
category: k8s
tags: [prometheus, observability]
youtubeId: hvACEDjHQZE
publishDate: 2022-01-20
thumbnail: ../../assets/images/promql.png
description: "Learning how to use the Prometheus Query Language is key to making full use of Prometheus. This blog post will show you what components it’s made of and how to use various PromQL queries."
---

Prometheus Query Language is the primary language that helps you visualize [Prometheus](https://www.dynatrace.com/news/blog/what-is-prometheus/) data in a dashboard or build alerting rules when using the alert manager of Prometheus. Knowing how to build a PromQL is an essential skill to use Prometheus, and with this blog post, I want to help you learn how to do it.

This is a summary of my video called “[How to build a PromQL](https://www.youtube.com/watch?v=hvACEDjHQZE)” on the Is It Observable YouTube Channel, which covers the following topics:

- The types of Prometheus metrics

- The ways of storing data in Prometheus

- The ways to filter data

- The operators

- A small tutorial on various queries

## Types of Prometheus metrics

I won’t describe the architecture of Prometheus in this blog post since this topic was covered in another video ([How to collect metrics in K8s](https://www.youtube.com/watch?v=JQrk6HwlN78)). If you’d like a refresher, read the summary here: [how to collect metrics in k8s](/observability/kubernetes/collect-metrics-in-kubernetes-cluster).

As we know, Prometheus stores the metrics scrapped from the various exporters in a time series database. You have an identifier for the metric you want to store, which will then be stored related to the timestamp of when the data was collected.

**Identifier -> ( timestamp1, value 1), ( t2,v2),....**

The identifier’s structure will be composed of a metric name and various labels.

For example :

**http\_request\_total{job=”httpcollector”, method=”GET”, path=”/tesst’}**

**job = where I scrapped that metric (defined in the scrap configuration file in Prometheus)**

**method = type of request**

**path = endpoint of our request**

Thanks to these labels, you can filter through the metrics. However, technically the metrics are stored in a JSON object like this:

```text
{
  job="httpcollector",
  method="GET",
  path="/tesst' ,
  __name__="http_request_total"
}
```

\_\_name\_\_ is the name of your indicator. You can use this to filter all the metrics with a certain name, for example.

When applying PromQL, Prometheus will transform the data and present it in 4 different formats:

- String

- Scalar

- Instant vector

- Range vector

The first two are easy to understand: String is just a text format, and Scalar is a numerical value. However, instant vector and range vector are a bit more complex.

### Instant vector

Data does not come to Prometheus at the same time. Prometheus reaches out to the various exporters to collect various data, and they all arrive at Prometheus at different times. When you run a query, you can evaluate the data based on the current time or a specific time.

I.e., if I use this query:

**rate(cpu\_meory\_usage\_total{ host=myserver, type=applicationserver, namesapce=test} \[30s\] )**

In the end, I’m using a filter on the time, (\[30s\]) which means “evaluate the query from the last 30s”.

It will return the value the cpu\_memory\_usage /s over the last 30s

Instant vectors give you **one value per series; if** you don’t indicate otherwise, it will be the last reported value.

### Range vector

The range vector doesn’t give you one value, like the instant vector; it gives you a set of values measured between two timestamps.

![Range vector](~/assets/images/vector.png)

## The various ways of storing data in Prometheus

If you're planning to write a Prometheus exporter, it’s crucial that you understand the various data types of Prometheus because you'll have to select the right set of data types depending on your use case. And even if you don’t build your exporter, it’s beneficial to understand the various data types so you can utilize the suitable functions.

Here’s an overview of those data types:

- Counter

- Gauge

- Histogram

- Summary

Several Prometheus clients can help you build your exporter. These clients are usually easy to use and several of their functions depend on the data type.

- Go

- Java

- Python

- Ruby

Let’s look at the data types in detail.

### Counter

The counter type is designed to store metrics that will increase in time, i.e., request\_count, error\_count, total, etc. It should not be used for metrics that decrease.

How can you query counters?

To query counters, you should use the “rate” function.

**rate( metric name \[last period of time\])**

Rate only takes counters as input, and it will return the per/sec of the counter during a specific period. It returns an instant vector.

**rate (http\_request\_count \[5s\]) = http\_request/s of the last 5 seconds**

Please be aware that if the exporter crashes for any reason, the counter will restart with the value 0 and increment from there. This is the biggest limitation of counters.

### Gauge

The gauge can be used for metrics where the value goes up and down, i.e., response time, memory usage, CPU usage, etc. Gauge is used quite often.

How do you query gauge in Prometheus?

Some functions and operators take input as a gauge, usually aggregated functions.

**avg\_over\_time(http\_response\_time\[5m\])** \= that will return the average response times of the last 5 minutes

DO NOT use rate with the gauge metric!

### Histogram

The histogram allows you to specify values for predefined buckets. Here’s an example:

Let’s say I would like to report the http\_response size. Every time I use the histogram to report, i.e., 2 seconds, then Prometheus will take my response times and count the number of requests fitting in specific buckets.

![Response time histogram](~/assets/images/historgrams.png)

The histogram will count the number of requests that had the value in our buckets. There are default buckets that have a clear structure:

.005,.01,.025;.05,.075.1,.25,.5,.75,1,2.5,5,7.5,10

So the default buckets will only support metrics for up to 10 seconds. You'll need to define custom buckets if you need to report a metric with a higher value. You need to know what the minimum and maximum values of your potential metric are.

Histograms report any value measurement to allow us to calculate averages, percentiles, etc. If you're not interested in the raw data, histograms will do a great job calculating them.

Prometheus will automatically store the number of elements in the histogram, and the total number reported (i.e., to calculate averages easily).

Here’s an example:

**Rate ( metric\_duaration\_sum\[5m\])/rate( request\_duration\_count\[5m\])** = to get the average response of the last 5 minutes.

There is also a predefined function to calculate percentiles, where “le” is the bucket name:

**Histogram\_quantile ( 0.95, sum(rate(request\_duration\_buckets\[5m\]))) by (le) )**

### Summary

The summary is very similar to the histogram. Histogram quantiles are calculated in the Prometheus server, while summary is calculated in the application server. Summary data can't be aggregated from several application instances.

Histogram requires you to use the default bucket or define your bucket depending on the metric's value. While summaries are perfect if you don’t know what the range of values will be upfront.

We usually use summary when we need to collect as many measurements to calculate averages or percentiles later. The summary is great if you don't need raw data or very precise measurements, i.e., response times or response size.

## How to filter data with PromQL

PromQL offers multiple ways to filter data. In this section, we will look at the following possibilities in detail:

- Labels

- Range operator

- Offset

- @ modifier

### Filter data with labels in PromQL

We’ve seen that Prometheus data have labels, allowing us to filter the metrics we have stored. Here’s an overview of the label matching operators:

- \= : Select labels that are exactly equal to the provided string.

- != : Select labels that are not equal to the provided string.

- \=~ : Select labels that regex-match the provided string.

- !~ : Select labels that do not regex-match the provided string.

Important: you need to specify a name or a label operator. You can't use an empty string.

NO: **http\_request\_total {path=””}**

NO: **http\_reques\_total{path=~”.\*”}**

YES: **http\_request\_total\[path=~”.+”}**

### Filter data with the range operator in PromQL

With the range operator, you can specify a time duration that will filter vectors between now and specific timing.

**\[time unit\]**

Time durations are specified as a number, followed immediately by one of the following units:

- ms - milliseconds

- s - seconds

- m - minutes

- h - hours

- d - days - assuming a day has always 24h

- w - weeks - assuming a week has always 7d

- y - years - assuming a year has always 365d

### Filter data with offset in PromQL

With offset, you can request the value from a certain amount of time before the moment the query was done.

http\_requests\_total offset 5m

**Filter data with the @ modifier in PromQL**

The @ modifier lets you change the evaluation date for a specific timestamp. Without this modifier, you would use the current timestamp by default.

You can combine range selectors and offsets with @modifier. Here are some examples:

**rate(http\_requests\_total\[5m\] @ 1609746000)**

offset after @

**http\_requests\_total @ 1609746000 offset 5m**

\# offset before @

**http\_requests\_total offset 5m @ 1609746000**

## Operators in PromQL

In PromQL, you have 3 types of operators:

1. Aggregation operators. They will **only use instant vectors as input and return instant vectors as the operator's output**. Some types of aggregation operators are: Sum, min, max, stddev, stdvar, quantile

   **Aggregation (\<instant vector>) => \<instant vector>**

2. Binary operators. Which can be:

   Arithmetic operators: +, -, / \* , ^ ;, %

   Comparison operators: !=,=,\<...

   And , or, unless

3. Functions. There are multiple functions that you can use, like: abs(), changes(), sort(), vector(), rate(), etc. Functions take as input the range vector and will output the instant vector. The rate function is smart enough to detect if your counter value has been restarted (after a crash, for example).

## Tutorial

Now that we’ve covered the most important data types, filters, and operators in PromQL, let’s jump into the tutorial!

- Watch the full video on YouTube here: [How to build a PromQL (Prometheus Query Language)](https://www.youtube.com/watch?v=hvACEDjHQZE&t=1551s)

- And follow the step-by-step instructions on GitHub: [PromQL tutorial](https://github.com/isItObservable/Episode-5---PromQL)

As a prerequisite, make sure that the following tools are installed on your machine before you start:

- jq

- kubectl

- git

- gcloud ( if you are using GKE)

- Helm

## Go deeper

- [View the tutorial on PromQL on GitHub](https://github.com/isItObservable/Episode-5---PromQL)
