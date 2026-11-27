---
title: "What happened at KubeCon North America 2022?"
slug: what-happened-at-kubecon-north-america-2022
category: otel
tags: [observability, kubernetes, opentelemetry]
youtubeId: Oeg5d2lIiMg
publishDate: 2023-01-18
thumbnail: ../../assets/images/kubecon_detroit.png
description: "Learn more about some of the most popular projects at KubeCon North America 2022 and what’s happening in them."
---

## What happened at KubeCon North America 2022?

In October, Henrik went to Detroit to attend KubeCon + CloudNativeCon 2022 North America and meet some representatives of different CNCF projects. He interviewed them about the status of their projects and anything interesting about them and shared the video on his YouTube Channel.

Here’s a short recap of who he talked to and what he learned about the state of CNCF projects.

To learn more about a single project, click the timestamp link in every paragraph.

If you want to watch the full video, click here: [What happened in KubeCon North America 2022](https://youtu.be/Oeg5d2lIiMg)

## Pixie with Zain Asgar

[Pixie](https://px.dev/) is about providing observability to your Kubernetes cultures. Within five minutes of installing Pixie, it will automatically instrument all your applications using [eBPF](/observability/kubernetes/how-to-observe-your-network-with-ebpf) to pull data from the kernel, like your networking information, database calls, and more.

Pixie’s native export format is OpenTelemetry, and there are PxL scripts used to query telemetry data collected by Pixie and extend it to collect new data sources. If you want to take advantage of Pixie, you deploy it like an agent in a daemonset. All of those agents will deploy EBPf programs in the node itself. And then you have a server that collects the data.

Pixie consists of two major components: the control and data planes.

The control plane runs in the cloud, whether self-hosted or not. The data plane is where most of the work happens. The data plane comprises two pieces:

- The agents, named PEM, deployed in the cluster collecting data from the cluster and the application and starting the data processing

- A collector named Vizier, responsible for query execution and managing the PEMs.

The data plane receives messages from the control plane to collect specific data from the cluster. Pixie will figure out how to send that request to the appropriate points and collect that information back.

You can deploy PXL scripts that will run persistently to retrieve data, convert it into OpenTelemetry and send it out somewhere.

Pixie is also collecting profiling data from the cluster. It would provide a CPU time flame graph. With the continuous profiling feature, you can quickly drill down into your issue.

If you have a performance problem, you can click on a particular pod and see which function uses a lot of C. The flame graph can immediately tell you which function needs to be fixed to solve a performance issue.

Link to the timestamp in the video: [01:03](https://www.youtube.com/watch?v=Oeg5d2lIiMg&t=63s) Pixie

## Linkerd with Jason Morgan

The most exciting update about [Linkerd](https://linkerd.io/) is that version 2.12 was released, the first version with the gateway API specification. This is a new way to approach networking or get traffic into your clusters with Kubernetes. It tries to replace Ingress objects and gives you APIs and tools for managing traffic inside your cluster, in between your applications.

There are also some tools doing what we call “fine-grained policy”, where you can allow a server to decide whether it should accept or reject traffic based on the service or the identity of the calling service. You do it based on the label selector, or you select the services by their service name.

Over the next couple of versions of Linkerd, they're hoping to move entirely to the Gateway API, meaning fewer custom resources and better interoperability with the ingress of the world. The plan is to keep it as simple as possible to operate Linkerd.

Link to the timestamp in the video: [04:45](https://www.youtube.com/watch?v=Oeg5d2lIiMg&t=285s) Linkerd

KubeCon Talk: [Flagger, Linkerd, and Gateway API: Oh my!](https://www.youtube.com/watch?v=9Ag45POgnKw)

## Prometheus with Bartek Plotka

In [Prometheus](https://www.dynatrace.com/news/blog/what-is-prometheus/), two major changes were merged:

- Out-of-order support (append samples older than were appended)

- [Native histograms.](https://promcon.io/2022-munich/talks/native-histograms-in-prometheus/)

Also, they're opening pandora’s box of the [PromQL engine](/observability/prometheus/how-to-build-a-promql-prometheus-query-language). Many projects are using PromQL and finally writing the volcano design that all major SQL engines have. And there is much more to come!

The team will gladly welcome contributors to the project!

Link to the timestamp in the video: [08:10](https://www.youtube.com/watch?v=Oeg5d2lIiMg&t=490s) Prometheus

## OpenTelemetry with Ted Young

Metrics for [OpenTelemetry](/open-telemetry/traces/a-short-guide-to-opentelemetry) were announced already in Valencia, and it has been GA for some time. Logging is also going to be GA soon. The project is moving quickly to stabilize the core set of signals.

The next thing the project is looking into is making the installation more convenient. Installation primitives are very low-level, and they aim to make it more opinionated to help first-time users.

They're also looking at adding new signals. Profiling, in particular, has a lot of community interest. As well as client-side instrumentation, a new version of the JavaScript SDK for browser-specific.

Link to the timestamp in the video: [10:44](https://www.youtube.com/watch?v=Oeg5d2lIiMg&t=644s) OpenTelemetry

KubeCon [Lightning Talk: Managing OpenTelemetry Through the OpAMP Protocol](https://www.youtube.com/watch?v=LUsfZFRM4yo)

## SIG Instrumentation with David Ashpole

[SIG Instrumentation](https://github.com/kubernetes/community/tree/master/sig-instrumentation) doesn’t own any of the instrumentation code, like any particular metric. Still, throughout the Kubernetes community, they set standards and guidelines for instrumenting your Kubernetes controllers or binaries with metrics, traces, logs, and so on.

These features and all the work they do comes built into Kubernetes. Their improvements aim to make everyone’s life better—for example, auto-generating documentation about all metrics across all components in Kubernetes.

They aim to set standards for how different components can add traces or instrumentation. Daniel’s focus is to add tracing in your cluster using OpenTelemetry. Currently, tracing is available in

- Kubelet

- And components of the master node receiving requests ( the API server).

Link to the timestamp in the video: [18:41](https://www.youtube.com/watch?v=Oeg5d2lIiMg&t=1121s) SIG Instrumentation

## OpenCost with Matt Ray

In June 2022, [KubeCost](/observability/prometheus/what-is-the-value-of-the-kubecost) announced that they were contributing [OpenCost](https://www.opencost.io/) to the CNCF, and it’s currently in Sandbox status. It’s open source Kubernetes cost monitoring.

If you are using a cloud provider like AWS, Azure, GCP, or on-premises, you can check against their billing APIs to see how much your Kubernetes usage costs. And you can slice and dice your Kubernetes usage along any dimension: by tag, by label, by pod, by namespace, etc.

OpenCost is meant to be an open standard, so they don’t want to reinvent the wheel by changing how you pull metrics out of a system. They want to standardize it so everyone can provide higher value, like optimization or greater efficiency.

Link to the timestamp in the video: [27:31](https://www.youtube.com/watch?v=Oeg5d2lIiMg&t=1651s) OpenCost

## Fluentd/Fluentbit with Eduardo Silva

The team was excited to announce that [Fluent Bit](https://fluentbit.io/) 2.0 was their biggest release ever.

You collect data on the left, process it in the middle, and then output it on the right. Now, on the left side, the input side, plugins can run in separate threads. You can take advantage of your system so your application can scale up.

Initially, [Fluentd](https://www.fluentd.org/) and Fluent Bit were all about logs, and the way data has been handled has been agnostic. Data is serialized in their internal data representation without caring what type of format it contains. However, they started working on metrics and now support the Prometheus text format. Now you can get Prometheus information as input and send it out as OpenTelemetry.

Link to the timestamp in the video: [32:05](https://www.youtube.com/watch?v=Oeg5d2lIiMg&t=1925s) Fluent Bit

KubeCon talk: [Fluent Bit V2.0: Unifying Open Standards For Logs, Metrics & Traces](https://www.youtube.com/watch?v=avzx7MNpB_w)

## Keptn with Thomas Schuetz

[Keptn](https://keptn.sh/) has been working on creating a new component: [Keptn Lifecycle Controller](https://github.com/keptn/lifecycle-toolkit) (now Toolkit).

Most continuous delivery and deployment approaches are currently pipeline or workflow-centric. The Lifecycle Toolkit aims to add a tail of tasks and evaluations in a cloud-native way and run them inside a Kubernetes cluster. Keptn runs processes and phases inside Kubernetes as an operator. It hooks into existing deployments and adds the functionality of pre and post-deployment tasks and relations.

For example, a pre-deployment check would be for infrastructure constraints. If you want to deploy a new application, you can check if enough CPU memory is available. After you deploy something, you can run some tasks for functional or performance tests.

You can get full observability about your deployment process. You get the full trace: how long your pre-deployment tasks took, how long the evaluations took, how long the application deployment took, etc.

Link to the timestamp in the video: [42:23](https://www.youtube.com/watch?v=Oeg5d2lIiMg&t=2543s) Keptn

[Keptn Beyond 1.0: Sailing into the future](https://www.youtube.com/watch?v=6bAfrMhdQdQ&list=PLj6h78yzYM2O5aNpRM71NQyx3WUe1xpTn&index=95)

## Cortex with Alvin Lin

A faster compactor is one of the new features they’re implementing right now at [Cortex](https://www.cortex.io/).

Historically, you compact blocks into increasingly bigger blocks, but when you ship them over the network, it becomes troublesome. So they're currently working on making these blocks small enough so that you can just get bits of them. When you query, you may only need part of the data block.

They're also collaborating with Thanos to bring vertical query charting into Cortex.

Link to the timestamp in the video: [46:49](https://www.youtube.com/watch?v=Oeg5d2lIiMg&t=2809s) Cortex

## Cilium With Thomas Graf

At KubeCon, Cilium introduced the Cilium service mesh and ingress support. [Cilium](https://cilium.io/) used to be only at the network level, and now they offer a sidecar-free and ingress solution that uses [Envoy](https://www.envoyproxy.io/) or eBPF.

Other exciting announcements are that Azure AKS is switching to Cilium, which means Azure CNI is powered by Cilium. And last but not least, they have applied for [CNCF graduation](https://cilium.io/blog/2022/10/27/cilium-applies-for-graduation/).

As announced in their [KubeCon talk](https://www.youtube.com/watch?v=WxZr35Eyqxk&list=PLj6h78yzYM2O5aNpRM71NQyx3WUe1xpTn&index=74), here is a summary of their upcoming roadmap:

- Gateway API support

- A new way of doing layer 7 load balancing just with Kubernetes and annotations

- BIG TCP support

- A replacement for the reef device

- A new version of MTLS

- Hubble will support OpenTelemetry, and it is integrated with Grafana

Link to the timestamp in the video: [48:11](https://www.youtube.com/watch?v=Oeg5d2lIiMg&t=2891s) Cilium

KubeCon talk: [Cilium Updates, News and Roadmap](https://www.youtube.com/watch?v=WxZr35Eyqxk&list=PLj6h78yzYM2O5aNpRM71NQyx3WUe1xpTn&index=74)

## TraceTest with Ken Hamric

Regarding [TraceTest](/open-telemetry/traces/how-do-you-get-started-with-tracetest), the team is hard at work on version 8. In version 7, they added a lot of capability around the UI, starting a trace and testing against it. In the new version, they're adding environment variables, allowing tests to output variables and to be chained together.

One of their goals is to end-to-end power tasks from the browser through the system, but they need to figure out how it will work.

[TraceTest](https://tracetest.io/) now also has an integration with the tail sampler processor. That means that it’s a receiver and can ingest OpenTelemetry.

Link to the timestamp in the video: [52:08](https://www.youtube.com/watch?v=Oeg5d2lIiMg&t=3128s) Tracetest

## Litmus with Karthik Satchitanand

[LitmusChaos](https://litmuschaos.io/) has come a long way since its launch a couple of months ago, and the community keeps growing. There was a great turnout at their co-located Chaos Day event at KubeCon. It’s great to see that many people want to improve the resilience of their applications.

[Litmus](https://litmuschaos.io/) announced the 3.0 beta program that focuses on making it simpler, leaner, and more resource efficient. The goal is to make chaos engineering easy for developers.

Link to the timestamp in the video: [55:20](https://www.youtube.com/watch?v=Oeg5d2lIiMg&t=3320s) Litmus

## When’s the next KubeCon?

KubeCon 2022 NA wrapped up some months ago, and now we're looking forward to the next one coming up in April in Amsterdam and November in Chicago.

Thank you to all project maintainers and contributors that talked to me during this event. And if you want to learn more about what they had to say, check out the full video on my YouTube channel: [What happened in KubeCon North America 2022](https://youtu.be/Oeg5d2lIiMg)
