---
title: "Mastering Nginx Instrumentation with OpenTelemetry"
slug: mastering-nginx-instrumentation-with-opentelemetry
category: otel
tags: [nginx-controller, ingress-controller, performance-engineering, opentelemetry, observability]
youtubeId: MRBDW81xz00
publishDate: 2024-07-29
thumbnail: ../../assets/images/nginxotel.jpg
description: "Instrumenting your ingress controllers and web servers is a key way to gain insight into your Nginx server's activities."
---

Instrumenting your ingress controllers and web servers is a key way to gain insight into your Nginx server's activities. In this blog post and related [YouTube tutorial](https://youtu.be/MRBDW81xz00), I’ll show you how to enable this with OpenTelemetry, following up on [my previous episodes about logs and metrics with Nginx](https://youtube.com/playlist?list=PL6VBQyIvTlRitWNvmyzNqUIwfzpUxrSvI&si=CN7ai7Wbcqf0x_Mm).

Here’s a quick overview of what I’ll cover:

- An introduction to web server modules and C++ instrumentation

- The instrumentation of your Nginx web servers, how to enable it, and configure it

- The tracing support provided to your ingress

- The features added by the OpenTelemetry operator.

## Introduction to Web Server Modules

The OpenTelemetry community has improved auto instrumentation in most languages, including C++ and C. Any project using these languages can also produce traces, meaning web servers like Apache and Nginx. Both of these have provided a module for their servers that can be enabled for tracing.

We can now produce traces from web and proxy servers to better understand the time spent on them. If Nginx web servers have this feature, you could utilize it within your ingress.

## Enabling tracing on the Nginx web server

Most web servers, including Nginx, provide plugins that provide extra features on top of the web server. Those plugins are designed as web server modules.

You install the module to add these extra capabilities to your web servers. Once installed, configure the module by editing the web server config file.

In the case of the OpenTelemetry module of Nginx, named nginx-plus-module-otel, compatible with version 1.25.3 of Nginx, it will produce traces when interacting with the following modules of Nginx:

- ngx\_http\_realip\_module

- ngx\_http\_rewrite\_module

- ngx\_http\_limit\_conn\_module

- ngx\_http\_limit\_req\_module

- ngx\_http\_auth\_request\_module

- ngx\_http\_auth\_basic\_module

- ngx\_http\_access\_module

- ngx\_http\_static\_module

- ngx\_http\_gzip\_static\_module

- ngx\_http\_dav\_module

- ngx\_http\_autoindex\_module

- ngx\_http\_index\_module

- ngx\_http\_random\_index\_module

- ngx\_http\_try\_files\_module

- ngx\_http\_mirror\_module

This means that if you use it to manage your authentication, serve static pages, or limit requests, the instrumentation of OpenTelemetry will fully cover you. The first step is to install this module on your Nginx server. For example, in the case of Ubuntu:

```
Yum install nginx-plus-module-otel
```

Once installed, you need to configure Nginx to enable the plugin. In nginx.conf, in the main section, you would add the following section:

```
load_module modules/ngx_otel_module.so;
```

Next, this module has a few configuration parameters, such as the exporter, the sampling decisions, and more.

What is great is that in the exporter configuration, you can precisely set the exporter's address and specify the batch size and count.

The batch size will specify the size of the batch per worker and the number of pending batches per worker thread. If this limit has been reached, the batch will be dropped, so you need to make sure you don’t have any pending batches on your worker and monitor the batch size.

For example:

```text
endpoint localhost:4317;
interval 5s;
batch_size 512;
batch_count 4;
```

We can also specify your OpenTelemetry service name, Nginx's behavior when propagating the trace context, and the sampling decisions.

So, for example:

```text
split_clients "$otel_trace_id" $ratio_sampler {
    10% on;
    * off;
}
server {
    location / {
        otel_trace $ratio_sampler;
        otel_trace_context inject;
        otel_service_name mynginx
        otel_span_name <custom span name of nginx>
    }
```

In this example, you defined a variable: ratio\_sampler. That would be used to configure the otel\_trace.

Otel\_trace requires creating a variable. It will specify whether tracing is enabled and define its sampling decision. In your example, you have set it to 10%, so it’s the head sampling decision.

Otel\_trace\_context is the setting for the trace propagation. There are several options:

- extract — it will reuse the current trace context available in the header of the request

- Inject — will create a new trade context

- propagate — is a combination of extract and inject

- ignore — skips context headers processing.

Last, you can add your custom attributes with otel\_span\_attr if you want to disguise your Nginx server by location, geo, and type of caching server, proxy, or web server.

Once enabled, Nginx will produce a span with the detail of the request using the semantic convention of OpenTelemetry:

- http.method

- http.target

- http.route

- http.scheme

- http.flavor

- http.user\_agent

- http.request\_content\_length

- http.response\_content\_length

- http.status\_code

- net.host.name

- net.host.port

- net.sock.peer.addr

- net.sock.peer.port

## Ingress controller instrumentation

Like the web server, the Nginx ingress controller also has a tracing feature. The great news is that you don’t need to build the ingress image with this feature. It is already included in the recent version of the ingress, but it is disabled by default.

To enable the instrumentation, you need to allow it to by configuring your ingress by modifying the configmap of your ingress by adding the following parameter:

```bash
  data:
    enable-opentelemetry: "true"
```

Out of just enabling it, it comes with sets of parameters: the name of the span given by your Ingres, the name of the service, and all the required configurations to export your traces:

- export port

- export host

- the batch size

- the sampling decision

It even has a flag to trust or not the incoming spans. This is similar to the web server settings you saw a few minutes ago, where you can define whether you should propagate the trace context.

Even better, the project has added annotation, allowing you to turn on / off the instrumentation for specific ingress rules. For example:

```yaml
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/enable-opentelemetry: "true"
```

It also adds the option to configure the trust incoming span has an annotation as well:

```yaml
    nginx.ingress.kubernetes.io/opentelemetry-trust-incoming-span: "true"
```

Ultimately, you can get full visibility by enabling the Prometheus metrics, access logs, and traces on your ingress. Again, enabling everything will come with a price. But as explained in the episode on the ingress, the metric does not provide the right dimensions to filter by the ingress rule, so observing your ingress based on logs or traces will level up your observability.

## The OpenTelemetry Operator

The last part is the OpenTelemetry Operator, one of my favorite projects in the OpenTelemetry community.

Suppose you want to learn more about the operator. In that case, I have produced a dedicated [episode related to it](https://youtu.be/tuiPSfqrmtg). I recently created an episode about a dedicated feature: [the target allocator](https://www.youtube.com/watch?v=Uwq4EPaMJFM), a unique feature built by the community. I strongly recommend watching it, especially if you’re collecting metrics with your collector using the Prometheus receiver.

To simplify your journey towards OpenTelemetry, the operator provides various CRDs to simplify your configuration. One CRD, the OpenTelemetry collector CRD, configures the deployments of your collectors.

Another CRD will inject the auto-instrumentation SDK agents into your workload. This feature is limited to a few languages: Java, NodeJS, Python, Go, and .Net.

It also has auto instrumentation settings for Apache and Nginx, so I’m not referring to the ingress but the traditional Nginx web server.

The auto instrumentation for Nginx is only compatible with version 1.22 and with the open source version of Nginx. Similar to the configuration of the instrumentation of your web server, it will require adjusting the Nginx configuration file. But don’t worry, you won’t have to do it. It’s the operator that will do it by magic. The operator expects the configuration file to be in /etc/nginx/nginx.conf. If it's different, it's not a big issue; you can also configure the path of the configuration file. For example:

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: my-instrumentation
nginx:
  image: your-customized-auto-instrumentation-image:nginx # if custom instrumentation image is needed
  configFile: /my/custom-dir/custom-nginx.conf
  attrs:
    - name: NginxModuleOtelMaxQueueSize
      value: "4096"
    - name:
      value:
```

The instrumentation library will require configuring the OpenTelemetry web module with specific parameters per web server: Apache and Nginx. Read more in the [OpenTelemetry documentation](https://github.com/open-telemetry/opentelemetry-cpp-contrib/tree/main/instrumentation/otel-webserver-module).

A list of parameters helps you adjust the service's name, the span's name, the batch size, and the sampling decision. You can also exclude a specific URL or path from the instrumentation. For example, let’s say that you don’t want to have traces generated on the contact page URL.

```
NginxModuleIgnorePaths \ contactpage
```

You can add regexp to this rule. The other great thing is that you can precise the HTTP header request and response that you would like to add in the span attributes with

NginxModuleRequestHeaders and NginxModuleResponseHeaders. You take advantage of it by configuring the instrumentation CRD to determine the destination of traces and the sampling decision. For example:

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
  nginx:
    attrs:
      - name: NginxModuleOtelMaxExportBatchSize
        value: 1024
      - name: NginxModuleServiceName
        value: mywebserver
```

Then, to inject the auto instrumentation, you need to add the following annotations to your Nginx deployment:

```yaml
instrumentation.opentelemetry.io/inject-nginx: "true"
```

And that’s how you configure tracing with OpenTelemetry on an Nginx server.

## Go deeper

- [View the tutorial on NGINX instrumentation with OTel on GitHub](https://github.com/isItObservable/nginx-instrumentation)
