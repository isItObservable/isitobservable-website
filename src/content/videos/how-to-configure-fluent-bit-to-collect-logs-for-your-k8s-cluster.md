---
title: "How to configure Fluent Bit to collect logs for your K8s cluster"
slug: how-to-configure-fluent-bit-to-collect-logs-for-your-k8s-cluster
category: k8s
tags: [kubernetes, fluent-bit, prometheus, fluentd]
youtubeId: KJlWV5-o8v0
publishDate: 2022-01-20
thumbnail: ../../assets/images/fluentbit.png
description: "Fluent Bit may be known as Fluent D’s smaller sibling, but it is just as powerful and flexible, having been built with cloud-native environments in mind."
---

This blog post is part of a series where I'll look at Kubernetes and how it can be observed with different tools. We have already looked at [how to use Prometheus](/observability/kubernetes/collect-metrics-in-kubernetes-cluster) and [Loki combined with Promtail](/observability/kubernetes/how-to-collect-logs-in-kubernetes-with-loki-and-promtail), but today, we will focus on Fluent Bit.

This article also summarizes what I discussed in my YouTube video tutorial: [How to configure Fluent Bit to collect logs for our K8s cluster](https://www.youtube.com/watch?v=KJlWV5-o8v0).

In this tutorial, we will deploy Fluent Bit in a K8s cluster to collect [logs](https://www.dynatrace.com/news/blog/why-log-monitoring-and-log-analytics-matter-in-a-hyperscale-world/) from pods. First, we will use Loki to store the logs; then, we will deploy the standard Fluent Bit and configure it to send log streams to Dynatrace. This is a perfect exercise to look at various possibilities to build your log stream pipeline.

However, before we go to the tutorial, let me introduce Fluent Bit and explain what makes it different from Fluentd. ([If you want to jump to the tutorial, click here](https://github.com/isItObservable/Episode3--Kubernetes-Fluentbit)).

## What is Fluent Bit?

Fluent Bit is a logging process tool part of the big family of log collectors/forwarders. It’s the little sibling of Fluentd and the most performant and lightweight log processor.

Logs are valuable in observability because they extend your capacity to analyze data, troubleshoot, and so on. In previous episodes, we mainly talked about application logs. But many other types of solutions generate logs:

- Databases

- Systems

- Web servers

- Accesses

- Etc.

Collecting and correlating all those logs is crucial to precisely understanding what is currently happening in our environments with the right context. This is where Fluent Bit comes in.

Fluent Bit collects logs from various sources, i.e., traditional servers, Linux environments, containers, Kubernetes, or pods. Then it adds context to the data (with a label) and transforms the log stream into a key-value pair format to be sent to a log storage solution (Elasticsearch, Kafka, Dynatrace, etc.).

Just like Fluentd, Fluent Bit also utilizes a lot of plugins. To build a pipeline for ingesting and transforming logs, you'll need many plugins.

Here’s a quick overview:

1. Input plugins to collect sources and metrics (i.e., statsd, colectd, CPU metrics, Disk IO, docker metrics, docker events, etc.).

2. Parser plugins to convert and structure the message (JSON, Regexp, LTSV, Logfmt, etc.)

3. Filter plugins to modify, enrich, and drop information from your log (Nest, Throttle, Expect, Geoplp, Grep, K8s, etc.) For filtering, you can also use an LUA script.

4. Output plugins send the logs stream to several outputs that will be in charge of storing the log stream and visualizing them. The fantastic thing about Fluent Bit is that you can use several output plugins for your pipelines and specify rules defining where the logs will be sent. (Loki, Azure Blob, Azure Log Analytics, Google Cloud Big Query, Elasticsearch, etc.)

## How do you configure Fluent Bit?

Fluent Bit can be deployed with the help of a helm chart. Behind the scenes, you will have a DaemonSet and the configuration file of Fluent Bit that will be stored in a config map or file. This is where you’ll define your pipeline, a.k.a., a sequence of steps that explain how you want to collect and send your data:

\[Input\]

\[Parser\]

\[Filter\]

\[Output\]

—----------------

### Short update:

After this tutorial was published, the Fluent Bit community released the [Fluent Bit operator](https://github.com/fluent/fluentbit-operator), which offers many nice features to help you manage your log stream pipeline.

The Helm installation utilizes DaemonSet, and, consequently, any update on our log stream pipeline requires restarting all the Fluent Bit agents. The operator resolves this by introducing several CRDs ( Custom Resource Definition):

- Fluentbit

- Fluentbitconfig

- Input

- Filter

- Parser

- Output

Each of those CRDs allows us to update our log stream pipeline dynamically.

To simplify the creation of your log stream pipeline, We recommend using a tool to help you configure Fluent Bit. In this tutorial, we will use [Calyptia](https://cloud.calyptia.com/), which validates your syntax and provides you with a visual representation of your pipeline.

![Calyptia screenshot](~/assets/images/Capture2.PNG)

## Why is Fluent Bit so powerful in K8s?

One of the great features of Fluent Bit is that you can directly add annotations on your deployment files that allow you to define which type of parser you need to use to collect the logs from a particular pod.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: apache-logs
  labels:
    app: apache-logs
  annotations:
    fluentbit.io/exclude: "true"
spec:
  containers:
    - name: apache
      image: eclipser/apache_logs
```

The plugins architecture makes Fluent Bit more powerful and easier to customize compared to other solutions like Promtail. It also supports many security concepts, especially for output plugins. You want to ensure that your data is safe when you send it to your storage.

## What is the difference between Fluent Bit and Fluentd?

As already mentioned, Fluent Bit is the little sibling of Fluentd, in the sense that they achieve many of the same things but have differently sized scopes.

While Fluentd is designed for servers, Fluent Bit is cloud-native and works with Kubernetes. It can deal with many nodes, pods, components, etc., and is compatible with servers, containers, and embedded systems.

Furthermore, Fluent Bit’s advantage is its lighter weight (650kb compared to Fluentd’s 40MB), which has been optimized to run at a high scale and low cost.

You can read further details about the differences on [Fluentd’s FAQ page](https://www.fluentd.org/faqs).

It should be mentioned that Fluent Bit and Fluentd are not exclusive - they can also be complementary. Combining the two tools allows you to build even more complex pipelines to collect and ingest your logs.

## Tutorial: How to configure Fluent Bit to collect Logs

The full tutorial can be found in video format on YouTube and as written step-by-step instructions on GitHub. Here are the links:

- YouTube video: [How to configure Fluent Bit to collect logs for our K8s cluster](https://www.youtube.com/watch?v=KJlWV5-o8v0&t=905s)

- GitHub page: [K8s and logging with Fluent Bit](https://github.com/isItObservable/Episode3--Kubernetes-Fluentbit)

## Go deeper

- [View the tutorial on Fluent Bit on GitHub](https://github.com/isItObservable/Episode3--Kubernetes-Fluentbit)
