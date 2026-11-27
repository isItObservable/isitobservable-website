---
title: "Observability Fundamentals: Open Standards"
slug: observability-fundamentals-open-standards
category: otel
tags: [opentelemetry]
youtubeId: hZoWu4gxx9w
publishDate: 2022-12-14
thumbnail: ../../assets/images/observablelights_openstandards.png
description: "Why do we need open standards? And where can you contribute?"
---

On my [YouTube channel](https://www.youtube.com/c/IsitObservable/), I have recently launched a new series called “Observable Lightning Talks”, where I invite three observability experts to share their knowledge with us.

In my first [episode](https://www.youtube.com/watch?v=hZoWu4gxx9w), I invited Steve McGhee, Aolita Sharma, and Michael Hausenblas to share their remarkable stories and takeaways from their work.

I already summarized my talk with Steve McGhee in a previous blog post ([Non-standard SLOs: beyond availability](/events/non-standard-slos-beyond-availability)) and the one with Aolita Sharma (Open Source Observability and OpenTelemetry - A win-win for users). Today, I’ll share the key takeaways from Micheal Hausenblas’ talk.

Michael Hausenblas is a Solution Engineering Lead and OpenTelemetry Product Manager in AWS's open source observability service team. He explains why open standards are needed and gives examples of projects you can contribute to.

## Why open standards?

Open standards are important in software engineering for three reasons in particular:

- Interoperability

- Enable users to swap implementations

- Mitigate lock-in

Specifications usually describe a system’s behavior. However, that doesn’t automatically make them a standard. You can turn a specification into a standard with consensus, meaning different vendors agree upon using the same specifications for their products.

Consequently, systems become interoperable, and users can swap out implementations. It also helps mitigate vendor lock-in, which is good from a user’s perspective. You're safe from being locked in if you have an API or an SDK.

Some basic requirements to create open standards are

- Access to specification

- Process

  - Bodies (IETF, W3C, CNCF) (Organizations that allow competitors to come together and write these specifications in a formal process)

  - Greenfield vs. after the fact (should you write the specification first or do it after the implementation?)

  - Dependencies

- Adoption (At the end of the day, adoption counts. Just because something is a standard, it doesn’t necessarily mean it will be used.)

## Examples of open standards

Some well-known examples of open standards are

- Web (HTTP, URL, etc.)

- JSON, protobuf, gRPC

- W3C Trace Context ([https://www.w3.org/TR/trace-context/](https://www.w3.org/TR/trace-context/))

- OpenMetrics ([https://openmetrics.io](https://openmetrics.io))

- OpenTelemetry ([https://opentelemetry.io](https://opentelemetry.io))

Especially when it comes to observability, adding open standards makes a huge difference, if only due to interoperability.

## Go deeper

- [Link to slides](https://www.slideshare.net/Giulia976464/observability-fundamentals-open-standards)
