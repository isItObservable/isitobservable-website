---
craftId: 353352
title: Sampling Best Practices in OpenTelemetry
subline: Learn about OpenTelemetry sampling techniques, such as head and tail sampling, and best practices to optimize your observability pipeline effectively.
date: 2025-02-10T13:49:00Z
author: giulia-di-pietro
topics:
  - traces
  - opentelemetry
  - observability
image:
  src: ~/assets/images/sampling.jpg
  title: The Ultimate Guide to Sampling in OpenTelemetry
  alt: null
youtube: https://www.youtube.com/watch?v=7T-KoxtU5GU
related:
  - open-telemetry/traces/a-short-guide-to-opentelemetry
  - open-telemetry/traces/how-to-instrument-your-code-using-opentelemetry
goDeeper:
  - text: View the tutorial on trace sampling on GitHub
    url: https://github.com/isItObservable/Sampling
---

Observability in modern software systems is as much an art as a science. Like an artist carefully selecting colors to create a masterpiece, developers carefully curate their observability data to troubleshoot effectively and maintain system health. While collecting all possible telemetry data might seem ideal, it’s rarely practical due to the overwhelming volume it generates. That’s where **sampling techniques** in [OpenTelemetry](https://opentelemetry.io/) come into play.

Sampling is the crucial process of selecting a subset of data to store and analyze, ensuring that your metrics, logs, and traces remain manageable while providing meaningful insights. This blog post dives deep into the **various sampling techniques in OpenTelemetry**, their significance, and actionable best practices to help you optimize your observability pipeline.

## Why Sampling Matters in Observability

Observability solutions were vendor-driven before OpenTelemetry and similar tools, and sampling decisions were largely proprietary. Fast-forward to today and OpenTelemetry has democratized observability, placing the responsibility of sampling directly in the hands of users.

Sampling is important because:

1. **Data volumes are massive**: Without sampling, storing and processing every trace, metric, or log would generate enormous costs.

2. **Focus on actionable data**: Sampling enables you to focus on the most critical data—errors, slow responses, and high-priority requests—allowing your team to troubleshoot effectively.

3. **Performance optimization**: Excessive telemetry data can strain resources and slow down systems. Sampling prevents this by filtering out unnecessary information.

Put simply, sampling allows you to balance system performance and observability needs.

## Sampling Techniques in OpenTelemetry

OpenTelemetry supports several sampling techniques to help control the telemetry data you collect and analyze. These techniques can be divided into **head sampling** and **tail sampling**. Let's explore each in detail.

### Head Sampling

**Head sampling** makes a sampling decision early—at the source of the trace. For example, if your application has multiple services, each can independently decide which spans to sample.

Types of head sampling include:

- **Always on sampling**: This method captures all traces. It is useful for debugging in non-production environments but is not suitable for production due to the high costs.

- **Always off sampling**: Don’t capture traces. This is useful when telemetry collection must be entirely disabled.

- **TraceIdRatioBased sampling** (*Probabilistic Sampling*): Only capture a configured percentage of traces based on the trace ID. For instance, if the sampling ratio is 0.1, only 10% of traces will be captured.

- **Parent-based sampling:** This ensures that child spans follow the sampling decision of their parent span. It is particularly useful for maintaining context within distributed traces.

### Tail Sampling

**Tail sampling** defers the sampling decision until the trace has been fully collected and analyzed. This decision-making process occurs in the OpenTelemetry Collector, which provides a global view of the entire trace.

Advantages of tail sampling include:

- Allows sampling based on more informed decisions, such as error flags or response times.

- Improves accuracy in high-throughput systems by analyzing entire traces before discarding any spans.

Tail sampling supports numerous policies for making sampling decisions, such as:

- **Error-based sampling**: Samples traces that include errors.

- **Latency-based sampling**: Samples traces that exceed a specific response-time threshold.

- **Attribute-based sampling**: Samples traces with specific attributes, such as high-priority customer requests.

- **Probabilistic sampling** (*from Tail*): This method samples traces based on a percentage, similar to head sampling, but with better insight into trace characteristics.

**Note:** While tail sampling is more precise, it’s also resource-intensive. The OpenTelemetry Collector needs to store spans in memory while waiting to make a sampling decision.

### Probabilistic Sampling in the OpenTelemetry Collector

The **probabilistic sampling processor** in the OpenTelemetry Collector combines the benefits of consistent sampling with flexibility. It introduces three modes:

- **Hash seed**: This is ideal for logs that lack trace IDs. Sampling decisions are based on a hash of a specified attribute (e.g., service ID).

- **Proportional** (default): Adjusts based on prior sampling probabilities.

- **Equalizing**: Ensures all elements have the same probability regardless of previous sampling history.

## Best Practices for Sampling in OpenTelemetry

Given the complexity of sampling decisions, here are some actionable best practices to guide you:

### 1. Use parent-based sampling for head sampling

Parent-based sampling ensures that child spans mirror the sampling decision of their parent spans. This is essential for maintaining trace fidelity, particularly in distributed systems.

*Pro Tip:* Avoid using TraceIdRatio-based sampling unless absolutely necessary, as it may distort trace-level metrics. Parent-based sampling provides more reliable statistics.

### 2. Generate span metrics carefully

If leveraging span-based metrics, ensure you know which spans have been sampled at the SDK level. Generating metrics from poorly sampled data can lead to misleading insights. Start by producing metrics in the OpenTelemetry Collector before applying sampling decisions.

### 3. Optimize tail sampling rules

Tail sampling offers the most flexibility but requires thoughtful configuration:

- Collect representative samples of normal traffic.

- Prioritize errors, slow transactions, and spans with high-priority attributes.

- Reduce noisy endpoints with lower sampling rates.

### 4. Implement memory management in the collector

Tail sampling increases the Collector’s memory usage. To avoid issues, configure the following:

- **Memory limiter processor** to enforce memory limits.

- **Batch processor** to optimize spans for efficient processing.

### 5. Leverage load balancing for scalability

For large-scale deployments, set up a dedicated Collector pipeline for sampling. Use a load balancer to ensure spans from the same trace are routed to the same Collector instance. This ensures consistent sampling decisions across distributed systems.

### 6. Continuously monitor and adjust sampling

Sampling is not a set-it-and-forget-it process. Regularly review your sampling settings to ensure they align with changing application traffic, business goals, and resource constraints.

## Choosing the Right Sampling Technique

Choosing between head sampling and tail sampling depends on your system’s specific needs:

- **Head Sampling** is lightweight, less resource-intensive, and easier to configure, making it ideal for applications with minimal sampling requirements.

- **Tail Sampling** provides precise control and configurable policies, better suited for complex systems with diverse observability goals.

Dynamic (adaptive) sampling is the long-term goal for the gold standard in sampling. While not natively available in all OpenTelemetry implementations, many vendors are actively developing this feature.

## Final Thoughts on Sampling in OpenTelemetry

Sampling may seem deeply technical, but it’s fundamentally about balancing cost, performance, and observability. By understanding and implementing OpenTelemetry’s sampling techniques effectively, you can capture the telemetry data that truly matters while keeping your systems efficient.

If you’re just starting with OpenTelemetry or looking to refine your implementation, remember that observability is a team effort. Gain buy-in from all stakeholders, experiment with different configurations, and keep the conversation going within your team.

Now, it’s your turn to apply these best practices and optimize your sampling strategy.
