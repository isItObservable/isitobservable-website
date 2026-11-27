---
title: "What is OpAMP? And what is Bindplane?"
slug: what-is-bindplane-and-what-does-it-do
category: otel
tags: [opentelemetry, observability, kubernetes]
youtubeId: N18z2dOJSd8
publishDate: 2022-12-16
thumbnail: ../../assets/images/bindplane.png
description: "Bindplane is an open source solution utilizing the OpAMP protocol to configure, monitor, and deploy various collectors."
---

Today’s blog post will focus on an open source solution that helps you design, observe, and update your [OpenTelemetry](https://www.dynatrace.com/news/blog/what-is-opentelemetry-2/) Collectors, and I’m referring to [Bindplane](https://bindplane.com/).

Keep reading if you're looking to build and upgrade your OpenTelemetry Collector Pipeline easily!

I'll start by introducing the current challenges when managing OpenTelemetry Collectors. Then, before I describe how Bindplane functions, I'll explain more about the [OpAMP](https://github.com/open-telemetry/opamp-go) protocol used by the solution. As usual, the blog post will end with a tutorial.

The YouTube video will also include an interview with the CEO of observIQ, Mike Kelly. Watch it here if you're interested in learning more.

## What are the challenges of managing OpenTelemetry Collectors?

As explained in “[Introduction to OpenTelemetry](/open-telemetry/traces/a-short-guide-to-opentelemetry)” and “[How to observe your K8s cluster with OpenTelemetry](/open-telemetry/how-to-observe-your-kubernetes-cluster-with-opentelemetry)”, the OpenTelemetry Collector is an optional component that helps you manipulate our OpenTelemetry data.

This component lets you change the sampling decision, modify your measurements by renaming metrics, adding labels, and dropping data, and produce [observability](https://www.dynatrace.com/news/blog/what-is-observability-2/) metrics on how much data you're currently processing.

To be able to manipulate the OpenTelemetry Data, you'll need to create an OpenTelemetry Collector Pipeline where you'll define the following:

- Receivers (where to collect the data)

- Processors (where we can manipulate our OpenTelemetry data)

- Exporters (to export the modified data).

The collector can be deployed in various ways, but the pipeline will always be the main configuration file of the collector holding our Collector Pipeline.

You launch the collector in a bare metal environment by passing the configuration YAML file. In [Kubernetes](https://www.dynatrace.com/news/blog/what-is-kubernetes-2/), you can deploy the Collector with a traditional deployment or daemonset, where Collector Pipeline is stored in a ConfigMap. You can also deploy your Collector using the OpenTelemetry Operator in a sidecar container (so the application container sends the telemetry data to the default exporter) or in a daemonset (where each node has a collector that receives telemetry data and exports it to one or several observability backends).

You don’t want to rely on one collector when dealing with many telemetry data. It would help if you built a chain of collectors, mixing sidecar and daemonset collectors. This enables you to do part of the processing locally; the daemonset collectors will do the last-mile transformation.

With such a deployment, you would need to manage several instances of collectors with various pipelines.

To be able to observe your environment correctly, you need to make sure that your collectors are running smoothly and healthily. You can do it manually by relying on Kube-state-metrics, with metrics provided by the collector, and with the Span Metrics processor or the zPages extensions. But this means that you'll also build the right dashboards and alerts to keep track of the health of your collectors.

The other challenge is related to configuring your collector pipelines. You can do it by defining your pipeline in .txt format, but it is sometimes complex to do it properly. You don’t just create a pipeline; you must also manage updates. When you update your pipeline, you must roll out most of your collectors and load the new configuration to ensure that the collectors are taking the latest settings.

The big challenge is when we start using the sidecar collector, which is required to roll out the entire application pod to ensure that the sidecar reads the new configuration.

How can you optimize getting live data from your collectors and managing their design and update?

For this, a fantastic project called Bindplane relies on the emerging protocol OpAMP. Let’s look at what that is.

## What is the OpAMP protocol?

OpAMP stands for Open Agent Management protocol. It's a protocol built to remotely manage various OpAMP clients (in OpenTelemetry = the OpenTelemetry collectors and other SDKs). This OpApmp project is part of the OpenTelemetry Project. As of now, there is [one Go implementation](https://github.com/open-telemetry/opamp-go).

OpAMP is designed to have a central server managing your OpenTelemetry fleet.

The server sends configuration and installation packages to the various agents deployed in your telemetry fleet. Every agent of your telemetry fleet can report its status, health, and more.

OpAMP supports

- Remote configuration

- Status reporting of the agents

- Telemetry data of the agents (CPU, memory usage, etc.)

- Installation and upgrade of the package

- Connection credential management

- Secure auto-updates

In the end, you have a server that can observe the health of your telemetry components and push various settings and updates.

OpAMP is designed with a client-server approach. Each component that needs to be managed by a given server needs to have an OpAMP client installed. Then it will connect to the server using the OpAMP protocol.

The OpAMP protocol currently supports the HTTP transport layer and WebSocket.

Each OpAMP client connected to the server will act like an agent. The server will have one ID per agent managed by the server. The [OpAMP protocol specification](https://github.com/open-telemetry/opamp-spec) describes in detail the structure of the message sent by the agent or server.

To send telemetry data, the OpAMP client sets up on the agent an OTLP exporter that pushes telemetry data to the OTLP receiver configured on the server. The telemetry data is exchanged using the official OTLP protocol and not OpAMP. OpAMP initiates the order of sending the telemetry, but the transport is done with OTLP protocol.

So OpAMP is there to manage your telemetry fleet, but what is the real use case?

There are two primary use cases for OpAMP in OpenTelemetry: the instrumentation SDK and the OpenTelemetry collector.

### The instrumentation SDK

When you’re using auto instrumentation or manual instrumentation, you configure how the data will be sent (i.e., the exporter, the batchspan process, the sampler, etc.)

When the OpAMP client is available in each OpenTelemetry SDK language, a future OpAMP Server could adjust on-the-fly sampling decisions, exporters, and more. This allows the observability backend of your choice to make the correct sampling decision to support the OpAMP protocol.

### OpenTelemetry collector

Managing 100+ collectors is a big challenge, so managing them centrally by pushing a new version of the collector pipeline in one click is amazing.

But more than that, you can also automatically get health and consumption details on what’s currently happening in the collector. Something that’s only been possible until now by using various processors.

OpAMP is an initiative influenced by observIQ, the company that built [Stanza](/open-telemetry/what-is-stanza-and-what-does-it-do) and donated it to OpenTelemetry. ObservIQ is currently the first solution providing OpAMP support.

## What is Bindplane?

Bindplane is an open source solution utilizing the OpAMP protocol to configure, monitor, and deploy various collectors.

The default OpenTelemetry Collector image available in the [OpenTelemetry collector contrib repo](https://github.com/open-telemetry/opentelemetry-collector-contrib) does not have the OpAMP client. ObservIQ currently provides a specific [Distro for the OpenTelemetry Collector](https://github.com/observIQ/bindplane-otel-collector).

Bindplane provides a Bindplane server and a WebUI. The Bindplane server acts like the OpAMP server; the WebUI shows you the various deployed collectors and their status and helps you design your collector pipeline. In your design, you define the list of receivers and configure them, the flow of processor you would like to use, and where to export your traces, metrics, etc.

Bindplane can be deployed on Linux, Windows, Mac, and soon Kubernetes. It also provides a CLI to deploy various agents, push a configuration to the agents, and more. ObservIQ plans on providing a managed version of Bindplane (beginning of 2023). If you're looking for a SaaS version of Bindplane, you can check out [the Bindplane website](https://bindplane.com/).

As already mentioned, Bindplane supports Kubernetes, meaning that you’ll have a StatefulSet to deploy the Bindplane Server (a daemonset with the OpenTelemetry observIQ Distro includes the OpAMP client).

To connect to your various collectors, considered as agent to the Bindplane server, you'll need to add to the observIQ collector the WebSocket URL to the bind plane server and the OpAMP\_SECRET\_KEY (the Bindplane config secret key).

The Bindplane UI is structured in 3 distinct sections:

- Overview showing the created configurations

- Agents listing all the agents registered in Bindplane

- Configs showing all the created configurations.

Creating a configuration requires specifying the OS of the agent (Mac, Linux, Windows). First, you select the source (the receivers of the collector).

![Bindplane configuration source selection (the receivers of the collector)](~/assets/images/bindplane1.png)

Then you select the destination of your signals.

Once the receivers and exporters are defined, you'll need to deploy existing agents.

![Bindplane configuration deploying existing agents](~/assets/images/bindplane2.png)

Once the configuration is loaded, you'll see the traffic in the UI.

To add a new processor, you simply need to select one of the boxes (Prometheus, OTLP, or Dynatrace) to add your processors. All receivers and destinations are [configuration files defined in Bindplane](https://github.com/observIQ/bindplane-op/tree/main/resources).

Each file describes the various parameters of the receiver/process and exporter. Therefore, you can easily add a new custom receiver, exporter, or processor in Bindplane.

For example, if you want to add a dedicated destination for Dynatrace OpenTelemetry trace ingests API, you could create a configuration file describing the various parameters. Dynatrace utilizes the OTLP HTTP protocol but requires a token to send the data. You can create a receiver with 2 parameters: The URL and the API token.

```yaml
apiVersion: bindplane.observiq.com/v1
kind: DestinationType
metadata:
  name: otlp_dynatrace
  displayName: OpenTelemetry Dyantrace (OTLP http)
  icon: /icons/destinations/dynatrace.svg
  description: Send traces to dynatrace endpoint.
spec:
  parameters:
    - name: dynatrace_endpoint
      label: Dynatrace url
      description: Dynatradce url ( example https://dded.live.dynatrace.co...) .
      type: string
      default: ""
      required: true
    - name: apitoken
      label: Access Token
      description: Access Token that is restricted to 'OpenTelemetry Trace inges' scope. Required if Endpoint is specified
      type: string
      required: true
      default: ""
      documentation:
        - text: Read more
          url: https://docs.dynatrace.com/docs/ingest-from/opentelemetry/getting-started/otlp-export
```

Then you define the type of signal supported and how to replace it in the collector pipeline:

```yaml
  traces:
    exporters: |
      - otlphttp:
          endpoint: {{ .dynatrace_endpoint }}
          headers:
            Authorization: "Api-Token {{ .apitoken }}"
```

Lastly, you can add the default processor that your exporter will use, for example:

```yaml
    processors: |
      - batch:
          send_batch_max_size: 1000
          send_batch_size: 1000
          timeout: 30s
```

Then to upgrade Bindplane with the new configuration, we need to use the Bindplane CLI. Like kubectl, once the CLI is installed, you must create a “profile” that matches the connection with one of your Bindplane servers. Once connected, you can apply your new configuration file:

```
Bindplanectl apply -f configuration.yaml
```

Bindplane also provides a custom destination, source, or processor that allows you to directly type the code related to the pipeline step you want to include.

![Bindplane configuration custom destination, source, or processor](~/assets/images/bindplane3.png)

For each connected agent, you can also look at the current telemetry data handled by the agent:

![Bindplane configuration telemetry data](~/assets/images/bindplane4.png)

## Tutorial

Let’s wrap up this introduction to Bindplane with a tutorial on deploying Bindplane and the Bindplane collector, creating a new destination type using the CLI, and configuring a new collector pipeline using the Bindplane UI.

In this pipeline, we will receive traces and metrics from OTLP and Prometheus and export the generated traces and metrics to Dynatrace.

For this tutorial, you would need the following:

- A k8s cluster

- The Prometheus operator

- The Cert manager

- The OpenTelemetry operator

- A Dynatrace tenant

- A version of the online boutique fully instrumented by the OpenTelemetry community

- Kubecost

- Bindplane

- The Bindplane CLI

- And the observIQ collector Distro.

In this demo, we will:

- Create a new destination type in Bindplane using the CLI

- Configure the new collector pipeline

- Deploy this configuration to the agents and the collectors

- And then look at the data ingested in Dynatrace.

Follow the whole tutorial on my YouTube video: [What is OpAMP? And what is Bindplane?](https://www.youtube.com/watch?v=N18z2dOJSd8)

Or go directly to the GitHub repository I prepared: [isItObservable/bindplane (github.com)](https://github.com/isItObservable/bindplane)

## Go deeper

- [View the Bindplane tutorial on GitHub](https://github.com/isItObservable/bindplane)
