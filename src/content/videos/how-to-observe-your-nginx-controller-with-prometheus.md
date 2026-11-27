---
title: "How to observe your NGINX Controller with Prometheus"
slug: how-to-observe-your-nginx-controller-with-prometheus
category: k8s
tags: [prometheus, observability, ingress-controller, nginx-controller]
youtubeId: Qz-nN7CGBII
publishDate: 2022-01-27
thumbnail: ../../assets/images/ingress_nginx_part1.png
description: "The NGINX Ingress controller provides a bridge between Kubernetes services and external ones. Let’s look at how to observe this communication with the help of Prometheus."
---

Observing the communication between your application hosted on Kubernetes and external services makes it possible to see any performance issues and how to solve them.

A good practice for well-performing communication is using an Ingress controller like NGINX, but if something goes wrong with it, it’s hard to fix any issues if you haven’t observability set up for it.

This blog post is part of a series on [observing the NGINX controller](https://docs.dynatrace.com/docs/ingest-from/setup-on-k8s/guides/deployment-and-configuration/monitoring-and-instrumentation/instrument-nginx), composed of 3 parts, each with its article and YouTube video.

1. [Observing with Prometheus](/observability/prometheus/how-to-observe-your-nginx-controller-with-prometheus)

2. [Observing with Loki](/observability/kubernetes/how-to-observe-your-nginx-controller-with-loki)

3. [Observing with Fluentd](/observability/kubernetes/is-your-nginx-ingress-controller-observable-part-3-with-fluentd)

In this article, we will focus on how to observe the NGINX Controller with Prometheus, starting first with explaining what NGINX is and what type of metrics you can collect from it. After the theoretical part, we will jump into the tutorial using Prometheus. (If you’d like to jump to the tutorial, here’s the link to the YouTube video: [Is your NGINX Controller observable - part 1 with Prometheus)](https://youtu.be/Qz-nN7CGBII?t=733)

## Introduction to the NGINX Controller

There are several ways to expose services/applications from your cluster in Kubernetes:

1. Creating a **K8s service with the type “LoadBalancer”**, which will allocate an external IP address to your service. If you create several LoadBalancers, you'll create several public IPs. This can have a big impact on the cost of your cluster.

2. Using a **[service mesh](/observability/service-mesh/what-is-servicemesh-and-specially-what-is-istio)**, for example, istio comes with an ingress gateway and new Kubernetes CRD: Gateway and VirtualSerivces. The service mesh will be able to route the traffic to your service using the rules defined for your gateways and virtual services.

3. Using the Kubernetes Ingress Controller, which will receive the incoming traffic and route it to the right service.

Kubernetes provides the interface of the ingress gateway but not the implementation. If you want to use it, you have to use an already existing one:

- NGINX ingress controller

- HAProxy ingress controller

- Contour

- Azure

- AWS

- Traefic

- Ambassador

- Kong Gateway

- ...etc

The ingress controller is the main component in charge of receiving external traffic, and it has a specific structure in Kubernetes. Here is an example of an ingress deployment file:

```text
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: Hello-Ingress
spec:
  ingressClassName: nginx
  rules:
    - host "mydomain"
      http:
        paths:
          - pathType: ImplementationSpecific
            path: "/app1"
            backend:
              service:
                name: service1
                port:
                  number: 80
          - pathType: ImplementationSpecific
            path: "/app1"
            backend:
              service:
                name: service1
                port:
                  number: 80
```

The ingress interface will specify the routing rules to handle traffic of our application:

![Ingress interface](~/assets/images/ingress.png)

Let’s say we have http://mydomain/app1 and http/mydomain/app2, and we want to route them to the right service. You will need to create 2 backend rules to be able to route the path app1 to our service 1 and the path2 to service 2.

The interface is just the description of the rules - you'll need an implementation to make the routing happen. The ingress controller will evaluate the defined rule and manage the redirections within our cluster.

Because our ingress controller will be the entry point of our cluster, we probably want to get a proper level of observability.

Recently, the ingress controller has introduced several CRD (custom resource definitions) to enhance the configuration of our ingress. I.e., the VirtualServer and VirtualRoute that will allow us to create traffic split, routing, and more; and Policies to configure the authorized IP source.

## What type of metrics can you collect from an ingress controller?

To measure the health of our ingress controller, we want to report metrics that will help us understand:

1\. System Metrics

- Average CPU usage of the controller

- Average Memory: AVG of the system.mem.used metric

2\. Application Metrics

- The number of bytes exchanged, the time to the first byte, the number of requests split by HTTP code, request time, client response time, upstream, downstream, and more.

But what is even more important is to collect the correct dimensions to be able to filter and split the data. Metrics are fine but remember our ingress will serve various paths, services, and applications. It would be essential for us to report the number of requests coming in a given service

Let's look at the various options to collect the desired data.

### NGINX status page

![Nginx status](~/assets/images/nginx-status2.jpeg)

NGINX comes with a status page that reports basic metrics about NGINX called the [stub status](https://nginx.org/en/docs/http/ngx_http_stub_status_module.html). This HTTP endpoint exposes metrics like the following:

- Active connections

- Accepts

- Handled connections

- Requests

- Reading

- Writing

- Waiting

With the help of the status page, NGINX provides a Prometheus exporter that will help us collect those indicators. Here’s the link to the exporter: [nginxinc/nginx-prometheus-exporter](https://github.com/nginxinc/nginx-prometheus-exporter).

Let’s now look at the Prometheus exporter in more detail.

## The default Prometheus exporter

Some metrics will require you to enable Prometheus data, otherwise, they won’t be exposed. To do this, you will have to modify the configuration of your NGINX controller by adding the following to the deployment:

```
-enable-prometheus-metrics = true
```

You'll need to ensure that the port exposing the path: /metrics is available and reachable (by default, port 9113). You can customize the port by adding to the deployment:

```
-prometheus-metrics-listen-port = XXXX
```

You will be able to retrieve the same level of details provided by the status page and get information related to the workerqueue and the last reload.

Some metrics, like the latency, will require you to enable an extra module :

```
-enable-latency-metrics = true
```

When deploying the NGINX controller to your cluster, you can install it with a Helm chart that will allow you to automatically enable a few settings like exposing the Prometheus exporter, enabling latency, and so on.

The NGINX controller will be deployed through a statefulset and all the settings of Nginx will be done with the help of environment variables and a configmap, replacing the nginx.conf.

From that config file, you'll be able to adjust your logging format.

### The diagnosis process

The documentation of the NGINX controller explains that there is a process for the diagnosis.

It explains to look first at the metrics the Prometheus exporter exposed to the basic level of understanding: level 0. Then you'll quickly need to look at the logs produced by the NGINX controller to get a deeper understanding of what’s happening. It means that logs are a great source of information for observability.

## Tutorial

So how do we do this in practice? Let’s jump into the tutorial, where we will build a dashboard with the default Prometheus exporter

Here are the requirements to get started:

1. A kubernetes cluster with 2 or 3 nodes

2. Deploy your ingress controller, in our case it would be the NGNIX ingress controller

3. Deploy prometheus operator

4. Deploy a ServiceMontior to let the prometheus operator scrap the metrics the NGNIX ingress controller

5. Deploy a demo application

6. Deploy a Ingress to expose Grafana on one Path and the hipster shop on the other path

7. Once the metrics have been scraped from the NGNIX ingress controller, we will connect to grafana and build a dashboard using Prometheus metrics.

Now, follow the step-by-step instructions at the following links:

- YouTube: [Is your NGINX controller observable? Part 1 with Prometheus](https://youtu.be/Qz-nN7CGBII?t=794)

- GitHub: [How to observa a NGINX ingress controller](https://github.com/isItObservable/Loki-Ngninx-Logql)

Now that we know logs are a suitable data source to observe our ingress controller, let’s see how we can take advantage of logs to increase the level of observability in the second part.

## Go deeper

- [View the tutorial on observing NGINX with Loki on GitHub](https://github.com/isItObservable/Loki-Ngninx-Logql/blob/master/part1.md)
