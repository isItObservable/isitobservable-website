---
craftId: 198327
title: What is Linkerd, and can you observe it?
headline: What is Linkerd, and can you observe it?
subline: Linkerd is one of the most popular service mesh tools. In this blog post, I will describe its architecture and how to set up observability with OpenTelemetry.
date: 2022-09-06T01:00:00Z
author: giulia-di-pietro
topics:
  - service-mesh
  - observability
  - kubernetes
  - istio
  - linkerd
image:
  src: ~/assets/images/linkerd.png
  title: What is Linkerd & can we observe it?- with Jason Morgan
  alt: null
youtube: https://youtu.be/-7KjZGpqHOg
related:
  - observability/kubernetes/collect-metrics-in-kubernetes-cluster
  - observability/kubernetes/how-to-collect-logs-with-fluentd
  - observability/service-mesh/what-is-servicemesh-and-specially-what-is-istio
  - observability/prometheus/what-is-the-value-of-the-kubecost
goDeeper:
  - text: View the tutorial on Linkerd on GitHub
    url: https://github.com/isItObservable/Linkerd
---

In a previous Is It Observable? [episode](https://www.youtube.com/watch?v=mOxF4cdBTd8) and [blog post](/observability/service-mesh/what-is-servicemesh-and-specially-what-is-istio), I introduced the concept of service mesh and how you can use it to improve the architecture of your microservices. And for that tutorial, I used a service mesh called [Istio](https://istio.io/), but there are multiple other tools that you can use instead of that one. That’s why today we will focus on another service mesh called [Linkerd](https://linkerd.io/), one of the most popular.

Here’s what you can expect from today’s blog post:

- A quick recap about service mesh

- An introduction to Linkerd and its architecture

- The service profile CRD

- The observability features

- Tutorial

The YouTube video will also include an interview with [Jason Morgan](https://twitter.com/rjasonmorgan), Technical Evangelist from Buoyant. Watch it to learn more about the status of the project!

## What is a service mesh?

In short, a service mesh handles the communication between services by providing features like the retry logic, TLS, ingress and egress, observability, etc.

With the help of a service mesh, you can focus on building the code for your application without having to include code that manages how the app behaves in the network.

If you’d like to learn more in-depth information about the service mesh, I’d recommend going to my previous blog post: [All you need to know about microservice architecture, service mesh, and Istio](/observability/service-mesh/what-is-servicemesh-and-specially-what-is-istio).

## What is Linkerd?

Linkerd is one of the most popular service mesh tools out there. It stands out due to some specific characteristics:

- The usage of a specific proxy: Linkerd-proxy written in Rust

- Linkerd does not provide any ingress but has been designed to work with K8s ingress solutions such as Nginx, Traefix, etc.

- The ease of use

Linkerd supports all the features expected from a service mesh:

- Retry logic

- Authentication

- TLS certificates

- Observability

- Traffic split with the Linkerd SMI extension

SMI is a standardized implementation of the K8s service mesh. It stands for Service Mesh Interface, which provides a few standard CRDs. Learn more about it here: [SMI | A standard interface for service meshes on Kubernetes (smi-spec.io)](https://smi-spec.io/)

### The Linkerd architecture

LIkerd’s control plane combines several components:

- The destination. This component is used by the data plane, and it provides all the destination rules: which requests, routes, retry logic, etc. are allowed. At the end, the destination will be the core component that manages the communication of our services through the Linkerd-proxy.

- The identity service. This component acts as the TLS authority and provides signed certificates to the various proxies, thus guaranteeing secured communication between proxies.

- The proxy injector. This component is registered with the Kubernetes admission controller. Every time a pod is created, the admission controller reaches the proxy injector that inspects the definition and the annotations. If the annotations exist, the injector modifies the workload by adding proxy\_init and Linkerd-proxy to the pod.

Linkerd’s data plane relies on the Linkerd proxy and the init container. The Linkerd proxy manages the communication, provides Prometheus metrics, manages the TLS, and more. The init container runs before any pod container, forcing the traffic to be routed to the Linkerd-proxy.

Like Istio, Linkerd provides a CLI that allows you to interact with the control plane of Linkerd. It helps you install the control plane, inject Linkerd proxy, check the installation, and more. You can also [deploy Linkerd using Helm](https://linkerd.io/2.11/tasks/install-helm/).

Linkerd also provides new CRDs in your K8s cluster:

- Server

- ServerAuthorization

- Service-profile

Server and ServerAuthorization will be required if you want to authorize specific incoming traffic to a specific service. In that case, you'll need to define the server mapping your service and the ServerAuthorization that will specify the clients allowed to connect to your service.

## The service profile CRD

Service-Profile is a CRD provided by Linkerd that helps you define a list of routes for your service.

For example, in the [Google hipster shop](https://github.com/GoogleCloudPlatform/microservices-demo), every product page is formatted the following way:

```
HTTP get http://<host>/product/OLJCESPC7Z
HTTP get http://<host>/product/0PUK6V6EV0
```

So it means that “HTTP get \<host>/products/\\w+” corresponds to all the URLs related to a product page. The URL to change currency is “HTTP post http://\<host>/setCurrency with form data” with currency code. And “HTTP get /cart” to view the cart page.

We can build a Service-Profile with 3 rules: one for the product page, one for the currency page, and one for the cart page.

By creating those routes, Linkerd will provide specific metrics related to the defined routes on the top of the service profile and the ability to define retry logic and timeout logic.

The following example shows the service profile:

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  creationTimestamp: null
  name: frontend.hipster-shop.svc.cluster.local
  namespace: hipster-shop
spec:
  routes:
    - condition:
        method: GET
        pathRegex: /
      name: GET /
    - condition:
        method: GET
        pathRegex: /carts
      name: GET /carts
    - condition:
        method: GET
        pathRegex: /products/[^/]*
      name: GET /products/{id}
    - condition:
        method: POST
        pathRegex: /setcurrency
      name: POST /setcurrency
    - condition:
        method: POST
        pathRegex: /carts
      name: POST /carts
```

The service profile exposes extra metrics with the viz extension I'll present later.

With the help of the service profile, we will be able to define the retry logic for the given route.

```yaml
- condition:
    method: GET
    pathRegex: /products/[^/]
  name: GET /products/{id}
  isRetryable: true
```

Linkerd applies a default retry budget, if you want to customize it you can add a retry budget in the service profile definition:

```yaml
retryBudget:
  retryRatio: 0.2
  minRetriesPerSecond: 10
  ttl: 10s
```

And the timeout:

```yaml
condition:
  method: GET
  pathRegex: /products/[^/]
name: GET /products/{id}
timeout: 300ms
```

Each route defined provides extra metrics in the Prometheus exporter.

## The observability features of Linkerd

Linkerd provides two types of observability support:

- Prometheus metrics

- Distributed traces

### Prometheus metrics

All the Linkerd-proxy will automatically expose metrics on port 4191, so you can simply create a service to [monitor for those metrics](https://linkerd.io/2.11/features/dashboard/).

The Linkerd-proxy produces the following types of metrics:

- Protocol level metrics

  - Request\_total: number of requests received

  - Response\_total: number of responses received

  - Response\_latency: a TTFB

- Route metrics

  - if you define routes with service-profiles, the Linkerd proxy will provide extra metrics related to your routes :
    - Route\_request\_total, route\_response\_total, route\_response\_latency with labels on the destination and the route name.

- Control plane metrics

  - The proxy will also expose metrics related to the communications between the proxy and the control plane.
    - Control\_request\_total, control\_response\_latency, contr\_response\_total

- Transport-level metrics

  - Tcp\_open\_total

  - Tcp\_close\_total

  - Tcp\_open\_connections ( number of connection currently open)

  - Tcp\_write\_bytes\_total and tcp\_read\_bytes\_total

  - Tcp\_connection\_duration\_ms

- Identity metrics to report TLS identity certificates KPI

  - Identity\_cert\_expiration\_timestamp\_seconds

  - identity\_cert\_refresh\_count

Otherwise, Linkerd provides extra metrics with the help of the viz extension that comes with its own Prometheus instance, Grafana dashboards, and a web interface to drill down into Linkerd’s metrics.

If you don’t want to use the Prometheus instance provided by Linkerd, there is a process to deploy the viz extensions without Prometheus. You specify in the helm chart that you don’t need Grafana and Prometheus, and you map your Prometheus server to the viz extension. In Prometheus, you'll need to configure it by adding new scraping configurations. You can also keep the Prometheus instance provided by Linkerd by using one of the features provided by Prometheus: [Federate](https://prometheus.io/docs/prometheus/latest/federation/). Federate means that a Prometheus instance can collect the data from another server. Proxies and control planes automatically have exporters, therefore we can easily ingest those metrics in Prometheus and other solutions like [Dynatrace](https://www.dynatrace.com/).

### Distributed traces

Linkerd provides support for distributed traces mainly compatible with OpenCensus (the ancestor of OpenTelemetry).

Opencensus produces traces using a specific tracing propagator: B3.

If you want to enable the tracing feature of Linkerd, you'll need to check if your instrumentation library uses the B3 propagator and if your observability backend supports B3 tracing contexts. Then, you need to install the Jaeger extension, which deploys the Jaeger backend, the Jaeger injector, and an [OpenTelemetry collector](/open-telemetry/how-to-observe-your-kubernetes-cluster-with-opentelemetry). If you already have Jaeger and the Collector installed, you can remove them from the Helm deployment file.

If you're generating traces with OpenTelemetry, you'll need to create a Collector pipeline receiving OpenTelemetry and Opencensus spans. Of course, you'll need spans with B3 tracing contexts to map all the spans together. The Jaeger injector is a core component that injects the right environment variables to every Linkerd proxy: the Collector service URL.

You'll need to restart your pods to get the tracing configuration applied to all your pods.

By enabling tracing on Linkerd, you'll get the latency of each communication with the Linkerd proxies.

## Tutorial

In this tutorial, we will look at the observability features of Linkerd. To follow the steps, you'll need:

- A Kubernetes cluster

- Linkerd

- Nginx ingress controller

- The demo application: hipster-shop instrumented with OpenTelemetry

- A small load test to generate some traffic

- The Prometheus operator

Follow the full tutorial on the video on my YouTube channel: [What is Linkerd? Can we observe it?](https://youtu.be/-7KjZGpqHOg)

Or directly on GitHub: [isItObservable/Linkerd (github.com)](https://github.com/isItObservable/Linkerd)
