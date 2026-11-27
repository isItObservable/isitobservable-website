---
title: "What is the OpenTelemetry Operator?"
slug: what-is-the-opentelemetry-operator
category: otel
tags: [traces, opentelemetry, metrics, kubernetes, observability]
youtubeId: tuiPSfqrmtg
publishDate: 2022-02-18
thumbnail: ../../assets/images/otel_operator.png
description: "The OpenTelemetry Operator helps you instrument your code with OpenTelemetry with minimal effort and without modifying your code."
---

You're probably already familiar with [OpenTelemetry](https://www.dynatrace.com/news/blog/what-is-opentelemetry-2/) but are unsure about making changes to your code to add instrumentation. Thankfully, OpenTelemetry has developed a Kubernetes operator that manages the OpenTelemetry Collector and the auto-instrumentation of workloads using OpenTelemetry instrumentation libraries.

In this blog post, a summary of my latest video on the Is It Observable Channel, we will look at the OpenTelemetry Operator and how it works. So, let’s get started!

If you're new to OpenTelemetry, check out my [Short guide to OpenTelemetry](/open-telemetry/traces/a-short-guide-to-opentelemetry) and [How to instrument your code with OpenTelemetry](/open-telemetry/traces/how-to-instrument-your-code-using-opentelemetry).

## Introduction to the OpenTelemetry Collector

The [OpenTelemetry collector](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/collector) could be deployed in different ways, for example:

- As an agent close to your application

- On the server hosting your application

- Or, as a service in charge of receiving data from various agents to forward it to our observability backend of your choice.

The collector has the advantage of being [vendor agnostic](https://www.dynatrace.com/news/blog/using-opentelemetry-to-eliminate-open-source-data-silos/). This means you can instrument your code utilizing standard OpenTelemetry libraries and avoid adding to your code any proprietary library that will help you to interact with our observability backend.

With the collector, you can keep your code neutral and use it to transform your data and push it to the right destination. It allows you to build pipelines for each telemetry signal: traces, logs, and metrics.

The pipeline defines how to:

- Collect telemetry data (which port and protocol to listen for incoming data)

- Process, filter, and transform the data to match with our observability backend

- Export the modified telemetry to one or several observability backends.

## What is the value of OpenTelemetry Operator?

To understand the value of the Operator, we need to start by explaining the main challenges posed by OpenTelemetry.

One of the first challenges is the complexity of deploying auto instrumentation. Modern applications are packaged in container images. Adding instrumentation to our code requires modifying our business logic by adding instrumentation logic and rebuilding the image.

So building all the images of all your applications could seem very expensive.

Let’s say that we have resolved the instrumentation challenge and have decided to avoid adding any proprietary exporters to our code. And we prefer to rely on the OpenTelemetry Collector to push the telemetry data to the observability backend and build an architecture of collectors to collect and ingest the measurements at scale.

Deploying the OpenTelemetry collector in Kubernetes relies on a pipeline definition stored in a config map.

The major disadvantage is that any updates on our pipeline require restarting all the pods of our OpenTelemetry Collector.

In the case of Kubernetes, the Operator simplifies a large part of managing telemetry data, like the deployment of the architecture of our collectors.

We may want to mix the usage of agent deployment and service deployment. So, the agent will be added to our pod as sidecar containers, and the service will be in charge of pushing the data to our backend.

Deploying this with a traditional collector could make it hard to create and maintain over time. We need to modify all the deployment files to add the sidecar container. The Operator will help us to automate the process of deploying the agents and managing the updates of our pipelines. It relies on the Kubernetes admission Webhook that is invoked when pods are created or updated. The Webhook modifies the pod object by adding the collector agents.

Another major advantage is related to instrumentation. We don’t need to rebuild the whole image of our application because the operator will help us automatically inject our instrumentation logic.

Managing the deployment and the instrumentation is possible with the Operator with the help of two new CRDs:

- The OpenTelemetryCollector

- The instrumentation

Let’s look at them in detail!

### The OpenTelemetryCollector CRD

The OpenTelemetryCollector CRD helps you to deploy your collector within your cluster. So, before describing the various features, let’s look at the CRD.

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: myoperator
spec:
  config: |
    receivers:
      otlp:
        protocols:
          grpc:
          http:
    processors:
    exporters:
      logging:
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: []
          exporters: [logging]
```

The OpenTelemetryCollector CRD allows you to customize the image of the collector, the number of replicas, the pipeline stored in the config object (instead of the config map in a traditional deployment), and the mode.

The mode defines how we would like to deploy the collector. There are 3 modes available:

- Sidecar

- Daemonset

- Deployment

#### Sidecar mode

The sidecar mode injects the collector to our pods with a specific annotation:

```
sidecar.opentelemetry.io/inject *
```

The value of this annotation could be either equal to true or false or to the name of a specific OpenTelemetry collector instance deployed in the same namespace as our workload.

If you deploy several OpenTelemetryCollectors with the sidecar mode in the same namespace, you'll have to specify your collector's name in your pod's annotation.

You can also annotate your namespace directly to force the usage of your collector.

The operator will take into priority the annotation defined at the pod level and then the namespace

#### Daemonset mode

The daemonset mode deploys the collector on every node of your cluster and creates one service to receive the telemetry data of your pod. In this deployment type, you won’t need to add any annotation to your workload.

But you need to remember that all your pods will send telemetry data to your collectors. So you'll probably need to size your collector properly to handle the traffic.

#### Deployment mode

The deployment mode is the default mode, where you can deploy one collector (or more, depending on the number of replicas defined) and one service for a specific namespace.

#### Combining different modes

Modes can and should be combined, i.e., you could have one or several sidecar deployments to receive local data and be in charge of pushing the data to the collector deployed as a daemonset.

### The instrumentation CRD

Outside of managing your OpenTelemetry pipelines and the way of deploying your collector, the Operator also provides an amazing feature helping us inject the instrumentation library in our pods: Instrumentation.

Attaching your instrumentation library requires either adding the instrumentation agent to the start-up of your application (in the case of Java) or adding a few lines of code at the start of your application to initialize the trace provider, the exporter, the instrumentation library, and more.

To avoid touching your code to add your instrumentation library, the OpenTelemetry Operator provides a feature that will automatically inject our instrumentation library into your pods.

Currently, the OpenTelemetry operator supports the auto instrumentation of the following languages:

- Java

- Node.js

- Python

The New Instrumentation CRD will need to be deployed in the application's namespace that you would like to instrument.

Let’s have a look at the instrumentation object:

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: my-instrumentation
spec:
  exporter:
    endpoint: http://otel-collector:4317
  propagators:
    - tracecontext
    - baggage
    - b3
  sampler:
    type: parentbased_traceidratio
    argument: "0.25"
```

As you can see, the object allows you to configure:

- The exporter

- The propagator

- The resource

- The sampler

And we can also customize the way we would like to instrument NodeJS, Python, and Java by adding environment variables to configure the span processor, the resources, or even the custom image of our agent.

The propagator accepts a list of propagation configurations, i.e.:

```yaml
  propagators:
    - tracecontext
    - baggage
    - b3
```

The sampler can also be configured with certain object types: always\_off, traceidratio, parentbased\_always\_on, parentbased\_always\_off, parentbased\_traceidratio, jaeger\_remote, xray.

The resource object accepts:

- addk8sUIDattributes, which is a boolean that will enabler to add k8s Uids attributes in our span attributes

- resourceAttributes, supporting a list of attributes, such as: "Servicename: test" or "Environment: dev"

This resource object will configure all your spans that are instrumented by instrumentation objects.

When using the instrumentation CRD, you'll also need to add an annotation to your workload to enable the injection of the proper instrumentation library.

The annotation can be added either in the namespace or in the pod specification.

To enable the injection of the Java agent you need to add the following annotation:

- instrumentation.opentelemetry.io/inject-java: "true"

For NodeJS:

```yaml
instrumentation.opentelemetry.io/inject-nodejs: "true"
```

```
And for Python:
```

```yaml
instrumentation.opentelemetry.io/inject-python: "true"
```

Similarly to the openTelemetryCollector object, the value can be either true or the name of your instrumentation object deployed in the same namespace as your workload.

These are the current features provided by the Operator, but you should expect to have more features soon to match the update related to metrics and logs.

Fluentbit has created an operator that also helps configure your Fluent Bit log stream pipeline. So we could probably imagine similar features in the OpenTelemetry Operator.

## OpenTelemetry Operator Tutorial

In this tutorial, we will deploy a vanilla version of the online boutique with no OpenTelemetry, OpenTracing, or OpenCensus. (Only the services built in C# and Go will be instrumented, as the Operator currently only supports Java, NodeJS, and Python).

The tutorial aims to configure the OpenTelemetry collector to export the generated traces to Dynatrace. We will deploy two collectors: one acting as a sidecar proxy and one in daemonset. The sidecar will push the data to the daemonset, which will forward it to Dynatrace.

You'll need:

- A Kubernetes cluster

- The NGINX Ingress controller

- The certmanager (required for the operator)

- A deployed OpenTelemetry operator

- A Dynatrace tenant with an api token allowing us to interact with the metric, log, and trace ingest API

- A Prometheus operator

Follow the full video tutorial on YouTube and GitHub at the following links:

- [The value of the OpenTelemetry Operator](https://www.youtube.com/watch?v=tuiPSfqrmtg) on YouTube

- [The OpenTelemetry Operator](https://github.com/isItObservable/OpenTelemetryOperator) on GitHub

## Go deeper

- [OpenTelemetry Operator GitHub Repository](https://github.com/open-telemetry/opentelemetry-operator)
