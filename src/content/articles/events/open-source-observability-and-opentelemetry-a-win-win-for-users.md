---
craftId: 222828
title: Open source observability and OpenTelemetry - A win-win for users
headline: Open source observability and OpenTelemetry - A win-win for users
subline: Why is observability important? How does OpenTelemetry fall into the picture? And what's new in the project?
date: 2022-12-16T17:00:00Z
author: giulia-di-pietro
topics:
  - observability
  - opentelemetry
image:
  src: ~/assets/images/observablelights_openobservability.png
  title: Open source observability and OpenTelemetry
  alt: null
youtube: https://youtu.be/hZoWu4gxx9w
related:
  - events/observability-fundamentals-open-standards
  - events/non-standard-slos-beyond-availability
---

On my [YouTube channel](https://www.youtube.com/c/IsitObservable/), I have recently launched a new series called “Observable Lightning Talks”, where I invite three observability experts to share their knowledge with us.

In my first [episode](https://www.youtube.com/watch?v=hZoWu4gxx9w), I invited Steve McGhee, Aolita Sharma, and Michael Hausenblas to share their remarkable stories and takeaways from their work.

I already summarized my talk with Steve McGhee in a previous blog post ([Non-standard SLOs: beyond availability](/events/non-standard-slos-beyond-availability)), and today I'll share the key takeaways from Aolita Sharma’s presentation.

Aolita Sharma is a Governance Committee Member on the [OpenTelemetry](https://www.dynatrace.com/news/blog/what-is-observability-2/) board and co-chair of the CNCF observability technical advisory group. She has a vast experience in cloud-native observability and shares with us why observability is important, how OpenTelemetry falls into the picture, and what themes are currently being discussed in the project.

## Why observability?

Observability

- Enables active understanding of the behavior of a system. (You're looking at the e2e systems and understand the system's behavior.)

- Tracks dynamic states of a system (To understand the different states of a system when an action is running and whether it’s healthy or unhealthy.)

- Takes into account uncertainty and variation in behavior

Today, the capacity of computers and networks has exponentially exploded. Their scale, diversity, computer power, commodity infrastructure, and speed vastly increase the volume and complexity of telemetry data that can be collected and empower advanced data analysis and visualization.

The whole pipeline of collecting, analyzing, and visualizing data is part of observability. Telemetry data is hugely important in understanding how a system functions. Metrics, traces, and logs are commonly used as processes and data to understand that behavior.

## What should be observed?

If you want to do observability well, Aolita recommends making every aspect of a system accessible. Every layer, service, application, component, etc. This is crucial to be able to understand every aspect of your system and be able to prevent failures. Furthermore, if there are failures, it enables you to understand quickly the root causes that lead you to prevent these failures in the future.

Full stack for observability means:

![What full stack means for observability](~/assets/images/aolita.jpg)

Observability touches every single area, just like security. When we build new features and libraries for observability, they integrate with every area of the system to collect data, process it, and analyze it.

The more you understand your system, the deeper insight you have into how a system can perform well and deliver the quality of service you want.

## Why does OpenTelemetry matter?

OpenTelemetry is an open source project and a system that collects and processes traces, metrics, and logs in an integrated way. It provides a baseline where the whole industry works together to define a specification to be implemented in the SDKs and APIs.

OpenTelemetry provides

- Otel observability specification

- OpenTelemetry data protocol (OTLP)

- Client application instrumentation APIs and SDKs in 11 languages

- Standalone collector, which functions as a collection agent

- Exporters and samplers

**OpenTelemetry matters because it’s the future of observability.**

OpenTelemetry is the second-largest project in the CNCF after Kubernetes. Thousands of engineers and experts in observability have come together to think about how to make observability more standardized and leverage open source to achieve it. So it’s a really big effort to be able to develop a standardized open source observability framework.

OpenTelemetry provides the foundational infrastructure for the automation of future smart systems. It enables intelligent root cause analysis, self-healing, self-learning, and self-evolving systems. Some systems can already do this, but we're still moving towards e2e systems. Observability provides the path to achieve it.

![OpenTelemetry Project Current Status table](~/assets/images/aolita2.jpg)

Some current topics that are being discussed within the project, building toward the larger goal of having in-depth observability that is out of the box, easy to use, and standardized, are:

- The end-user workgroup

- Web maintainer team expanding (documentation)

- Improving the contributor experience

- Increasing the footprint and supporting better client instrumentation (RUM telemetry)

- Developing a control plane (OpAMP)

- Profiles

- Implementing logs

- File-Based Configuration

- Capturing telemetry from CI/CD systems (Jenkins, Argo, etc.)

- Semantic conventions

- Additional Kubernetes metadata

- Standard query format for telemetry data

- OpenTelemetry Demo Application

### OpenTelemetry Demo Application

The OpenTelemetry Demo Application runs through a complete end-to-end distributed system instrumented with 100% OpenTelemetry traces and metrics.

You can try it out here on GitHub: [https://github.com/open-telemetry/opentelemetry-demo](https://github.com/open-telemetry/opentelemetry-demo)

Or learn more: [https://github.com/open-telemetry/opentelemetry-demo/tree/main/docs](https://github.com/open-telemetry/opentelemetry-demo/tree/main/docs)

It showcases how to:

- Instrument your application for 10 language SDKs

- Create custom spans for richer, more useful traces using auto instrumentation

- Propagate trace context automatically and manually

- Pass observability data attributes between services

- Create attributes, events, and other telemetry metadata

## Get involved and contribute

The project roadmap is prioritized through action: contribute to areas that are important to you.

The best way to get involved is to join a [weekly SIG call](https://opentelemetry.io/community/) or the [CNCF Slack #OpenTelemetry](https://cloud-native.slack.com/archives/CJFCJHG4Q) channels.
