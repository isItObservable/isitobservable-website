---
craftId: 137476
title: How do you measure your cloud cost with Kubecost?
headline: How do you measure your cloud cost with Kubecost?
subline: Kubecost provides real-time cost visibility and insights for teams using Kubernetes, helping you continuously reduce your cloud costs.
date: 2022-05-04T00:30:00Z
author: giulia-di-pietro
topics:
  - prometheus
  - grafana
  - metrics
  - observability
image:
  src: ~/assets/images/kubecost.png
  title: How to measure your cloud Cost? & KubeCost Tutorial
  alt: null
youtube: https://www.youtube.com/watch?v=UllA5FnnGTs
related:
  - observability/kubernetes/how-to-optimize-your-k8s-applications
  - observability/prometheus/how-to-observe-your-nginx-controller-with-prometheus
  - observability/kubernetes/collect-metrics-in-kubernetes-cluster
  - observability/prometheus/how-to-build-a-promql-prometheus-query-language
goDeeper:
  - text: View the Kubecost tutorial on GitHub
    url: https://github.com/isItObservable/kubecost
---

Have you ever wanted to know how much your cloud costs you? And how to reduce these costs? [Kubecost](https://www.kubecost.com/) is a solution that aims to use observability to give you insights into the costs of your cloud-based environment.

Today’s blog post will look at Kubecost, what it is, why it’s needed, and how to use it. As usual, I have also prepared a video tutorial showing you how to get started with it:

But first, I’ll briefly introduce why you need cost management with cloud-based environments.

## Introduction to cost management

Cloud-native technology enables modern architecture designed for elasticity, scalability, extendability, and more. However, with great power also come some challenges that can cause a lot of high costs.

We're used to monitoring and observing our systems' health, availability, and performance, but often we forget to measure the cost of our environment.

Cost is an important dimension of our observability and should also be a KPI that’s leveraged to make decisions. Unfortunately, measuring and reporting the cost related to a cloud environment is a bit difficult because each hyperscaler has its pricing system.

### What makes cost management complex in Kubernetes?

In Kubernetes, we use a variety of services to manage our cluster:

- Persistent volumes

- Managed databases

- Network services to expose our services

- Auto provisioning of nodes

The goal is to measure the costs of a given project, namely how much the different environments cost us. This requires splitting the cost by several entities: namespaces, workload, nodes, etc. We don’t want to report the overall cost of a cluster, but it’s difficult to get more detailed information using a cloud provider’s billing API.

Another challenge related to cost is defining the right requests and limits on our deployments to avoid underusing nodes and paying for unused resources. It’s usually possible to update requests and limits based on the performance and reliability KPI, but taking the cost angle is more difficult because you usually don’t have that level of detail.

Furthermore, if you're working with several hyperscalers, getting a centralized view of your cloud cost becomes even more complex. More than just reporting cost metrics, the goal is to understand what you should do to reduce the cost of our clusters.

Thankfully, a few solutions provide you with the ability to estimate the cost of your environment: Kubecost and Anodot. Today, we will focus on Kubecost.

## The core features of Kubecost

Kubecost allows you to keep track of the cost of your Kubernetes cluster by either estimating the cost or connecting your hyperscaler to get precise figures. It also recommends a few tips on how to make some savings on your costs.

Kubecost relies on the Prometheus stack, including:

- Kubestate metrics that provide all metrics related to Kubernetes objects (kubestate metrics retrieve those metrics from the Kubernetes API)

- Node exporter to collect metrics related to the node usage

- cAdvisors to get metrics related to the containers

- CoreDNS to get network metrics

The Kubecost server relies on the cost-analyser pod that includes:

- A frontend web UI including Grafana dashboards

- A Kubecost server to manage all the backend API calls between the various components or clusters

- And a cost model that provides cost allocation calculation and metrics (the secret sauce of Kubecost)

It can either estimate the cost based on a model calculation or connect to your hyperscaler to get billing data, currently supporting GCP, AWS, and Azure.

## Kubecost sections

Kubecost is composed of different sections:

- Overview

- Cost allocation

- Assets

- Savings

- Reports

- Alerts

Let’s have a look at some of them in more detail.

### Overview

The overview gives you a technical view of the usage of our cluster in a given location (cloud provider). Kubecost shows you the monthly cost of the cluster and gives you some recommendations on how to save costs potentially.

It also displays how the cost is split between the available namespaces and the Kubernetes assets (node, load balancer, cluster management, disk, etc.), and gives you an overview of cluster efficiency, showing what is allocated vs. what is used.

The overview gives us a good view of where we're consuming and what we could improve.

![Kubecost overview](~/assets/images/Kubecost_screenshot.png)

### Cost allocation

The cost allocation section allows you to browse into our workload and understand the cost of the namespaces and what is causing this cost (CPU, memory, PV, …etc.).

The best part is being able to drill down in a given namespace and see in detail the cost related to the workload running in this namespace. The efficiency score of a workload helps you identify deployments that could be optimized.

Of course, we could browse from a namespace to workload and workload to pods.

![Kubecost cost for last 7 days by namespace](~/assets/images/Kubecost_screenshot2.png)

### The pod level shows the current cost of your request settings. So, in the end, we have the correct information to modify our request and limits to optimize based on cost metrics.

(This section is also part of the savings section of Kubecost.)

### Assets

Assets report where the cost is located (disk, cluster management, etc.).

![Kubecost assets report](~/assets/images/Kubecost_screenshot4.png)

### Savings

Savings is the most interesting part of Kubecost because it helps you identify tips for improving your cluster costs by reducing either the sizing of your nodes or the request or limits.

![Kubecost savings](~/assets/images/Kubecost_screenshot5.png)

![Kubecost Request Sizing Recommendations](~/assets/images/Kubecost_screenshot6.png)

## Cost model settings

The cost model settings used as you're deploying Kubecost are based on an estimation of your cost. You can adjust the parameters by changing the settings.

To get a more precise view of the costs, it’s recommended to integrate Kubecost with your cloud provider. When the cloud integration is enabled, the cost will be updated once the cloud provider makes the billing information available. Before that, it would just be an estimated cost.

For example, if you have a new node, the price of it will be estimated until your cloud provider shares the actual cost.

You'll need to export your billing information to GCP big queries for GCP. Kubecost will then interact with the big queries API to collect the actual cost of your cluster. For AWS, Kubecost will use s3 buckets for [Athena](https://aws.amazon.com/athena/), which allows you to collect live data from your cluster. For Azure, Kubecost will interact with the Billing Rate Card API.\
\
Finally, the most amazing feature is that Kubecost provides cost metrics in a Prometheus format. As a result, you can collect those metrics and use them within your observability or DevOps automation. That enables you to use Kubecost metrics as SLI/SLO for your CI/CD quality gates or even for production SLO.

To be able to collect Kubecost metrics, you're required to deploy a ServiceMontor.

## How to deploy Kubecost

Kubecost provides a helpful chart to help you deploy Kubecost with all the desired components:

- Prometheus

- Kubestate metrics

- Node exporter

- Cca advisor

- The core Kubecost stack and more

Kubecost can be used in several ways: open source, business, or enterprise.

The Kubecost open source solution limits the ability to collect data to 1 single cluster and has a data retention of 15 days. The business offering allows you to monitor an unlimited number of clusters with larger data retention periods. Enterprise is ideal for large customers with many clusters (above 200 nodes).

For a longer metric retention period (a feature only available in business or enterprise versions), Kubecost relies on Thanos to get the data from several clusters. For this type of deployment, it’s recommended to use GCP, AWS, or Azure long-term storage.

You need to consider several things to deploy Kubecost using the existing Prometheus stack. The tutorial below will show you how to do it.

Kubecost has slightly changed the labels provided by kube-state-metrics, node exporter and created new Prometheus rules. Therefore, if you want to connect Kubecost to your existing Prometheus stack you need to:

- Add PrometheusRule to add the Kubecost rules

- Add additional scraping information to relabel few kube-state and node exporter metrics

- Deploy the Grafana dashboard in your Grafana server by adding them to the Grafana using either the Grafana API or a sidecar container in Grafana

- Update the setting of Kubecost to configure the address of our Grafana server

Once the Prometheus stack is done properly, we would need to change the configuration of

Kubecost is based on two config maps: Kubecost-cost-analyzer and Nginx-conf

## Tutorial

This tutorial will deploy the kubecost and configure it to use our existing Prometheus Operator.

To follow this tutorial, you need to fulfill specific requirements:

- Kubernetes cluster

- NGINX ingress controller

- Deploy a demo application, in our case we will use the Hipster-shop

- Use k6 to generate traffic on the hipster-shop and generate CPU and memory

- Prometheus operator

- Kubecost

Follow the full steps of this tutorial at the following links:

- YouTube video: [https://www.youtube.com/watch?v=UllA5FnnGTs](https://www.youtube.com/watch?v=UllA5FnnGTs)

- GitHub repository: [https://github.com/isItObservable/kubecost](https://github.com/isItObservable/kubecost)

I hope you enjoyed this introduction to Kubecost. Subscribe to my YouTube channel to not miss any future videos!
