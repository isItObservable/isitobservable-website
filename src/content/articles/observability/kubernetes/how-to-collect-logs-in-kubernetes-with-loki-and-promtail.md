---
craftId: 3024
title: How to collect logs in Kubernetes with Loki and Promtail
subline: "Logging has always been a good development practice because it gives us insights and information to understand how our applications behave fully. Multiple tools in the market help you implement logging on microservices built on Kubernetes. In this blog post, we will look at two of those tools: Loki and Promtail."
date: 2021-12-23T08:46:00Z
author: giulia-di-pietro
topics:
  - kubernetes
  - promtail
image:
  src: ~/assets/images/loki_2022-01-27-091625_eqrz.png
  title: How to collect logs in k8s with Loki and Promtail
  alt: null
youtube: https://www.youtube.com/watch?v=XHexyDqa_S0
related:
  - observability/prometheus/how-to-build-a-promql-prometheus-query-language
  - observability/kubernetes/collect-metrics-in-kubernetes-cluster
  - open-telemetry/how-to-observe-your-kubernetes-cluster-with-opentelemetry
  - observability/prometheus/what-is-the-value-of-the-kubecost
  - observability/kubernetes/how-to-optimize-your-k8s-applications
goDeeper:
  - text: View the tutorial on Loki and Promtail on GitHub
    url: https://github.com/isItObservable/Episode2--Kubernetes-Loki
seo:
  description: "Multiple tools help you implement logging on microservices built on Kubernetes. In this blog post, we will look at two of those tools: Loki and Promtail."
jsonLd:
  - "@context": https://schema.org
    "@type": FAQPage
    mainEntity:
      - "@type": Question
        name: What is the importance of logging?
        acceptedAnswer:
          "@type": Answer
          text: Logging provides insights and information on what happens during the execution of code, helping diagnose issues and errors. It is a key pillar of observability.
      - "@type": Question
        name: Why does logging need to be standardized?
        acceptedAnswer:
          "@type": Answer
          text: Standardized logging helps manage logs efficiently, avoiding storage issues and complexity in the pipeline. It ensures logs are stored and indexed properly for better observability.
      - "@type": Question
        name: What are Loki and Promtail?
        acceptedAnswer:
          "@type": Answer
          text: Loki is a log aggregation system designed to store and query logs from various sources. Promtail is an agent that ships the contents of local logs to Loki.
      - "@type": Question
        name: How does Loki's architecture support log collection?
        acceptedAnswer:
          "@type": Answer
          text: Loki's architecture is designed to be cost-effective and scalable, storing logs in a way that allows for efficient querying and retrieval.
      - "@type": Question
        name: How can I set up Promtail to collect logs in Kubernetes?
        acceptedAnswer:
          "@type": Answer
          text: Promtail can be set up by deploying it as a DaemonSet in Kubernetes, which ensures that logs from all nodes in the cluster are collected and sent to Loki.
---

This blog post is part of a Kubernetes series to help you initiate observability within your Kubernetes cluster.

This article also summarizes the content presented on the “Is it Observable” episode "[How to collect logs in k8s using Loki and Promtail](https://youtu.be/XHexyDqa_S0)", briefly explaining:

- The importance of [logging](https://docs.dynatrace.com/docs/analyze-explore-automate/log-monitoring/acquire-log-data/log-monitoring-kubernetes)

- The notion of standardized logging and centralized logging

- Loki’s architecture

## Why logging is important

Logging has always been a good development practice because it gives us insights and information on what happens during the execution of our code. Logs are often used to diagnose issues and errors, and because of the information stored within them, logs are one of the main pillars of observability.

### Why does logging need to be standardized?

Since there are no overarching logging standards for all projects, each developer can decide how and where to write application logs.

There are usually two options:

The first one is to write logs in files. This is a great solution, but you can quickly run into storage issues since all those files are stored on a disk. One way to solve this issue is using log collectors that extract logs and send them elsewhere. However, this adds further complexity to the pipeline.

The second option is to write your log collector within your application to send logs directly to a third-party endpoint. Here the disadvantage is that you rely on a third party, which means that if you change your login platform, you'll have to update your applications.

In conclusion, to take full advantage of the data stored in our logs, we need to implement solutions that store and index logs. The usage of cloud services, containers, commercial software, and more has made it increasingly difficult to capture our logs, search content, and store relevant information. We're dealing today with an inordinate amount of log formats and storage locations. Maintaining a solution built on Logstash, Kibana, and Elasticsearch (ELK stack) could become a nightmare.

To simplify our logging work, we need to implement a standard.

## Standardizing Logging

We use standardized logging in a Linux environment to simply use “echo” in a bash script.

For example:

```
Echo "Welcome to is it observable"
```

When you run it, you can see logs arriving in your terminal. The “echo” has sent those logs to STDOUT.

In a container or docker environment, it works the same way. Logging information is written using functions like system.out.println (in the java world). When we use the command: docker logs \<ID of our container>, docker shows our logs in our terminal.

In the docker world, the docker runtime takes the logs in STDOUT and manages them for us. It will take it and write it into a log file, stored in var/lib/docker/containers/\<ID of the container>. Each container will have its folder.

If we're working with containers, we know exactly where our logs will be stored!

Pushing the logs to STDOUT creates a standard. We can use this standardization to create a log stream pipeline to ingest our logs.

## Centralized logging

Now we know where the logs are located, we can use a log collector/forwarder.

This tool is in charge of:

- Collecting logs

- Transforming logs

- Filtering logs

- Adding contextual information (pod name, namespace, node name, etc.)

- Forwarding the log stream to a log storage solution

Once logs are stored centrally in our organization, we can then build a dashboard based on the content of our logs.

Now, let’s have a look at the two solutions that were presented during [the YouTube tutorial this article is based on](https://www.youtube.com/watch?v=XHexyDqa_S0): Loki and Promtail.

## Introduction to Grafana Loki

[Loki](https://grafana.com/oss/loki/) is a horizontally-scalable, highly-available, multi-tenant log aggregation system built by Grafana Labs. This solution is often compared to Prometheus since they're very similar. To differentiate between them, we can say that Prometheus is for metrics what Loki is for logs.

Loki is made up of several components that get deployed to the Kubernetes cluster:

**Loki server** serves as storage, storing the logs in a time series database, but it won’t index them. To visualize the logs, you need to extend Loki with Grafana in combination with LogQL.

**Loki agents** will be deployed as a DaemonSet, and they're in charge of collecting logs from various pods/containers of our nodes. Loki supports various types of agents, but the default one is called Promtail.

## Introduction to Promtail

Promtail does the following actions:

- It discovers the targets having logs

- It attaches labels to log streams

- And it pushes the log stream to Loki

Promtail has a configuration file (config.yaml or promtail.yaml), which will be stored in the config map when deploying it with the help of the helm chart.

In the config file, you need to define several things:

- **Server settings**. Meaning which port the agent is listening to.

  - Promtail also exposes an HTTP endpoint that will allow you to:

  - Push logs to another Promtail or Loki server.

  - You have a half endpoint

  - And also a “/metrics” that returns Promtail metrics in a Prometheus format to include Loki in your observability. You can track the number of bytes exchanged, stream ingested, number of active or failed targets..and more.

- **Client configuration**. To specify how it connects to Loki.

- **Positioning**. To make Promtail reliable in case it crashes and avoid duplicates.

- **Scrape config**. That will specify each job that will be in charge of collecting the logs.

- **Relabel config**. That will control what to ingest, what to drop, what type of metadata to attach to the log line.

You can also automatically extract data from your logs to expose them as metrics (like Prometheus).

## Loki configuration

Loki’s configuration file is stored in a config map. Here you can specify where to store data and how to configure the query (timeout, max duration, etc.). W

When deploying Loki with the helm chart, all the expected configurations to collect logs for your pods will be done automatically. If you need to change the way you want to transform your log or want to filter to avoid collecting everything, then you will have to adapt the Promtail configuration and some settings in Loki.

## Tutorial: collecting logs with Loki and Promtail

In this tutorial, we will use the standard configuration and settings of Promtail and Loki. We want to collect all the data and visualize it in Grafana.

The full tutorial can be found in video format on YouTube and as written step-by-step instructions on GitHub.

Here are the links:

- **YouTube video**: [How to collect logs in K8s with Loki and Promtail](https://youtu.be/XHexyDqa_S0?t=979)

- **GitHub page**: [K8s and logging with Loki](https://github.com/isItObservable/Episode2--Kubernetes-Loki)
