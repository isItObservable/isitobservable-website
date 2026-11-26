---
craftId: 86622
title: How to instrument your code using OpenTelemetry
subline: OpenTelemetry is an open source project for observability that aims to establish a platform-neutral standard for traces and metrics. But where do you start instrumenting your application with OpenTelemetry?
date: 2022-02-02T10:28:00Z
author: giulia-di-pietro
topics:
  - opentelemetry
  - traces
  - metrics
  - kubernetes
  - observability
image:
  src: ~/assets/images/otel_instrumentation.png
  title: "OpenTelemetry Code Instrumentation: Key Concepts and Best Practices"
  alt: null
youtube: https://www.youtube.com/watch?v=ICCspGTRTXw
related:
  - site-reliability-engineering/get-started-with-sre-part-1
  - site-reliability-engineering/getting-started-with-sre-part-2
  - open-telemetry/traces/a-short-guide-to-opentelemetry
  - open-telemetry/what-is-the-opentelemetry-operator
  - open-telemetry/how-to-observe-your-kubernetes-cluster-with-opentelemetry
seo:
  description: OpenTelemetry is an open source project for observability. Find out where to start instrumenting your application with OpenTelemetry?
jsonLd:
  - "@context": https://schema.org
    "@type": FAQPage
    mainEntity:
      - "@type": Question
        name: What is the difference between manual and automated instrumentation?
        acceptedAnswer:
          "@type": Answer
          text: Manual instrumentation requires developers to add code to generate telemetry data, while automated instrumentation uses agents or libraries to inject telemetry logic into the application without modifying the source code.
      - "@type": Question
        name: When should I use manual instrumentation?
        acceptedAnswer:
          "@type": Answer
          text: Manual instrumentation is recommended when automated tools do not provide the level of detail needed or when working with custom code that is not supported by auto-instrumentation libraries.
      - "@type": Question
        name: What are some best practices for instrumenting code with OpenTelemetry?
        acceptedAnswer:
          "@type": Answer
          text: Focus on instrumenting critical API calls and operations that impact business performance. Use service mesh tracing for upstream/downstream calls and ensure consistent trace context propagation.
      - "@type": Question
        name: What is the goal of OpenTelemetry auto instrumentation?
        acceptedAnswer:
          "@type": Answer
          text: The goal is to simplify the adoption of observability by reducing the effort required to instrument code, making it easier to collect telemetry data without manual changes.
      - "@type": Question
        name: What is auto instrumentation?
        acceptedAnswer:
          "@type": Answer
          text: The instrumentation library is injected during the code execution. It means that we're attaching to our application a third party library that will inject byte codes to collect the desired traces in the case of Java.
      - "@type": Question
        name: How to get started with instrumentation?
        acceptedAnswer:
          "@type": Answer
          text: To start, write a small manual instrumentation with OpenTelemetry first. This will give you an idea of how OpenTelemetry works internally. For example, start by creating the trace provider and then setting everything to the trace provider and accepting exporters. Then create traces and spans. When you’ve instrumented the whole thing, you’ve understood how OpenTelemetry works for trace instrumentation. You don’t need to do it for production code. You can do it with a small sample, like a single API. After you know how Otel works, you can start using auto instrumentation for the specific product.
---

Utilizing OpenTelemetry in your application’s code is a great way to understand how it works and where its services are spending time. Thanks to OpenTelemetry, we can reach the level of detail we want in the application.

In this blog post, I’m not going to explain the details of what [OpenTelemetry](https://www.dynatrace.com/news/blog/what-is-opentelemetry-2/) is (if you're interested, please read my [short guide to OpenTelemetry](/open-telemetry/traces/a-short-guide-to-opentelemetry)); we will instead look at how to apply it practically.

Here’s an overview of the topics we will touch upon today:

- The difference between manual and automated instrumentation

- Best practices on how to instrument your code

And last but not least, we will summarize some key OpenTelemetry tips from my interview with Yoshi Yamaguchi from Google, one of the OpenTelemetry core contributors.

Let’s jump right into it!

## What’s the difference between automated instrumentation and manual instrumentation?

Depending on the framework or the language, auto instrumentation has the major advantage of avoiding adding instrumentation logic to our code to collect traces.

### What does auto instrumentation mean?

The instrumentation library is injected during the code execution. It means that we're attaching to our application a third party library that will inject byte codes to collect the desired traces in the case of Java.

Auto instrumentation is not magic, it only focuses on instrumenting well-known frameworks.

It means that you'll first need to figure out if your framework is supported by the auto instrumentation library of your language

It relies on an agent, highly dependent on the framework/language. Meaning that you need a specific agent for each different language or technology.

You can find a full list of all supported libraries or frameworks on the [OpenTelemetry GitHub page](https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/supported-libraries.md).

In the future, the OpenTelemetry community wants to make sure that automatic instrumentation is the preferred option to

- Increase adoption

- Reduce cost of instrumentation

For now, depending on the framework, the level of detail provided by the library could match with your requirements. But if you don’t have the expected level of detail you want, then you will have to use manual instrumentation.

## Best practices on how to instrument your code

Starting the journey in instrumenting your code may seem complicated and challenging. Luckily, I’m here to help you get to grips with it.

### Where to start

Since we want to generate traces to be able to troubleshoot quicker, we will first focus on API calls and operations that impact most of our business. If we have well-known performance bottlenecks, we should focus on operations that are called frequently and slow down our system.

One way to cover API calls is to use the tracing capabilities provided by our Service Mesh, which generates a span for each upstream/downstream API service call. This source information is crucial because it helps us build the dependencies map of our application and identify any networking issues between our services.

Once enabled, we want to track the interaction with our storage (databases, external storage, etc.). This can be easily done by utilizing the auto instrumentation of the frameworks that interact with our storage.

Now we should understand the most important application components that help us drive our business. So, it’s time to add manual tracing to the most important processes (but make sure that the components are stable enough to avoid rewriting your instrumentation).

### Increasing the level of detail

To increase the level of detail, you can take advantage of testing. Testing (unit, functional, performance) is now mainly happening at an early stage, so you could utilize it to ensure that generated traces have enough details to help us troubleshoot.

If you see that a process lacks details, add the instrumentation to the process and re-run your tests. This process lets you have high application coverage with a minimal level of traces for your production environment. Of course, you'll have to improve your level of traces continuously.

### Tracing coverage

To calculate the tracing coverage of your application, you can count the number of requests having spans/the total number of requests and multiply it by 100. However, that will only report your HTTP communications.

Our CICD process would track the code coverage of our tracing libraries, and we would then be able to compare our traces from one release to the next.

Ensure that you design your traces with enough details but avoid extreme tracing. If every method generates spans, the generated traces may be difficult to view and be consumed in your observability backend. Similarly to logging, you can also imagine introducing a tracing verbosity DEBUG, INFO… By using verbosity, you'll be able to adjust the level of detail that you would like to provide.

### Reporting errors

Lastly, but very important, it’s also crucial to ensure to report the state of your spans as errors. If you instrument manually, make sure to set the trace state to an error on each of your try/catch

## Tips from the OpenTelemetry expert

When it comes to tips and best practices, you can never quite get enough. So, let’s get some advice from Yoshi Yamaguchi, one of the core contributors to OpenTelemetry and who works for Google in the Google Cloud team as a Developer Advocate.

### Getting started with instrumentation

To start, Yoshi recommends writing small manual instrumentation with OpenTelemetry first because it gives you an idea of how OpenTelemetry works internally.

For example, start by creating the trace provider and then setting everything to the trace provider and accepting exporters. Then create traces and spans. When you’ve instrumented the whole thing, you’ve understood how OpenTelemetry works for trace instrumentation. You don’t need to do it for production code. You can do it with a small sample, like a single API.

After you know how Otel works, you can start using auto instrumentation for the specific product.

### Use the collector as much as possible

The collector reduces the number of exporter connections to the backend and gives you a simpler architecture for sending spans to the backend. Though it's under development and not fully functional for metrics and logs, it works for traces. Yoshi strongly recommends using it if you can.

### Recommended Span Processor and Sampler

Yoshi personally uses [BatchSpanProcessor](https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk/0.7.1/io/opentelemetry/sdk/trace/export/BatchSpanProcessor.html) because in his use case, he only creates the samples and doesn’t need the real-time traces in the backend, regardless of size. The Batch Span Processor reduces the CPU usage for sending traces to the backend for production cases.

For sampling, he recommends AlwaysOnSampler because he wants to check if the code is working fine after confirming the span is available as expected. He tweaks the AlwaysOnSampler to ensure that not too much backend disk space is consumed.

### Metrics and logs in OpenTelemetry

As per our [previous blog post](/open-telemetry/traces/a-short-guide-to-opentelemetry) on OpenTelemetry, the OpenTelemetry community is working hard to develop support for metrics and logs.

As Yoshi explains, the status of metrics is currently complicated: the specs of metrics are in general availability (GA), API and SDK are under implementation, but exporters aren’t ready for GA. OpenTelemetry metrics can be currently tried out for Java, .Net, Golang, and Python, but there will be breaking changes - so it’s not advisable to try it with production code. GA is expected for June 2022 for many languages.

However, Yoshi is particularly excited about logs, mostly from [Stanza](https://github.com/observIQ/stanza) and developed by the [observIQ](https://bindplane.com/) team. There is currently a working implementation, so that you can try it out today.

### Implement the sqlcommenter

Google recently donated the sqlcommenter to the OpenTelemetry foundation, enabling developers to add SQL comments with trace information to achieve an e2e trace. Thanks to the sqlcommenter you can have more context and information. Yoshi recommends using it if you're heavily using databases in your application. It will give you a better understanding of how to use OpenTelemetry.

## Tutorial - Instrumenting your code with OpenTelemetry

To accompany these tips and tricks on instrumenting your code with OpenTelemetry, I have also prepared a tutorial which will soon be available on my YouTube Channel. Stay tuned for an update coming soon! In the meantime, subscribe, so you don’t miss it: [Is It Observable?](https://www.youtube.com/channel/UCRiin4u8YZGlVQRZp7qOOaw)

Or watch the full interview with Yoshi Yamaguchi here: [How to instrument your code using OpenTelemetry](https://www.youtube.com/watch?v=ICCspGTRTXw)
