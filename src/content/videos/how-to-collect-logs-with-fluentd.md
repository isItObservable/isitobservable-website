---
title: "How to collect logs with Fluentd"
slug: how-to-collect-logs-with-fluentd
category: k8s
tags: [kubernetes, fluent-bit, prometheus, fluentd]
youtubeId: j76ozzIbuO8
publishDate: 2022-01-27
thumbnail: ../../assets/images/fluentd.png
description: "Fluentd is an open source data collector that allows you to unify data collection and consumption for a better use and understanding of data"
---

Collecting logs is a key part of observability and there are multiple ways you can do it. In this blog post we will focus on [Fluentd](https://www.fluentd.org/), which is one of the most popular tools for Kubernetes. We will cover the following topics:

- Introduction to Fluentd

- How to parse files

- How to deploy Fluentd in Kubernetes

As usual, the blog post will be linked to a step-by-step tutorial hosted on my YouTube video and GitHub repository. If you’d like to jump directly to the video, here’s the link to it: [How to collect logs with Fluentd](https://www.youtube.com/watch?v=j76ozzIbuO8).

## Introduction to Fluentd

Fluentd is the older sibling of [Fluent Bit](https://fluentbit.io/), and it is similarly composed of several plugins:

- Input plugins to collect logs

- Output plugins to export logs

- And many plugins that will help you filter, parse, and format logs.

### Input plugins

Input plugins are made to define several sources of log streams. In our environments there are several components producing logs:

- The database server

- The application itself

- The web server

- And others

Several input plugins are available for Fluentd, as you can see in their [documentation](https://www.fluentd.org/plugins/all). Tail is probably the one that you are going to use the most, as it reads logs from a file.

Other useful plugins are http, forward, tcp/udp, syslog, and exec.

When using the input plugin with Fluentd, you will see that it’s important to use tags. They will help you design and build your pipeline. Depending on the source of your logs, the structure could be different. Therefore, with a tag you can apply the right parser. You can also specify the destination of your log stream based on tags.

### Output plugins

Output plugins are used to export the imported logs to the third-party solution you are utilizing, like [Dynatrace](https://docs.dynatrace.com/docs/observe-and-explore/logs/log-management-and-analytics/lma-log-ingestion-via-api/lma-stream-logs-fluentd-k8s).

Here’s some of the output plugins that are available:

- Forward

- Mongo

- Kafka

- Elasticsearch

- Stdout (useful for debugging)

- Http

Output plugins use the \<match> block, so it’s important that you tag your log stream.

### Community plugins

One of the main advantages of Fluentd is the large number of plugins built by the community. If you don’t find an input or output plugin related to your technology, check the contrib repository. There might already be an existing one!

Another powerful feature is the Prometheus plugin that allows you expose Prometheus metrics from your Fluentd server. For example, we can export our metrics using the forward output plugin and use Prometheus to generate counters reporting the number of forwarded records.

You can also add labels to your Prometheus metric.

```text
<match kubernetes.*>
  @type copy
  <store>
    @type forward
    <server>
      name myserver1
      host 192.168.1.3
      port 24224
    </server>
  </store>
  <store>
    @type prometheus
    <metric>
      name fluentd_output_status_num_records_total
      type counter desc The total number of outgoing records
      <labels> tag ${tag}
        hostname ${hostname}
      </labels>
    </metric>
  </store>
</match>
```

## How to parse files

To explain how to parse files, we should look at a common and useful example: collecting logs from our haproxy ingress controllers.

The logs of haproxy usually looks like this:

```
haproxy[27508]: info 127.0.0.1:45111 [12/Jul/2012:15:19:03.258] wss-relay wss-relay/local02_9876 0/0/50015 1277 cD 1/0/0/0/0 0/0
```

From the log format we can see that there is

- The process name

- The process id

- The severity

- The ip adresse

- The port

- The date and time

- The server

- The number of bytes

- And some stats

  Active connection

  Connection to haprox

  Connection to backend

  Server connection

  The number of retries

  Server queue

  Backend queue

So we can directly apply the following regular expression ;

```
/^(?<ps>\w+)\[(?<pid>\d+)\]: (?<pri>\w+) (?<c_ip>[\w\.]+):(?<c_port>\d+) \[(?<time>.+)\] (?<f_end>[\w-]+) (?<b_end>[\w-]+)\/(?<b_server>[\w-]+) (?<tw>\d+)\/(?<tc>\d+)\/(?<tt>\d+) (?<bytes>\d+) (?<t_state>[\w-]+) (?<actconn>\d+)\/(?<feconn>\d+)\/(?<beconn>\d+)\/(?<srv_conn>\d+)\/(?<retries>\d+) (?<srv_queue>\d+)\/(?<backend_queue>\d+)$/
```

We can build a log stream pipeline collecting the logs using the input plugin tails, then format the logs using our regular expression. We tag the stream as haproxy and structure the time\_format, as you can see below:

```text
<source>
  type tail
  path /var/log/haproxy/haproxy.log
  pos /path/to/file_position_file
  format /^(?<ps>\w+)\[(?<pid>\d+)\]: (?<pri>\w+) (?<c_ip>[\w\.]+):(?<c_port>\d+) \[(?<time>.+)\] (?<f_end>[\w-]+) (?<b_end>[\w-]+)\/(?<b_server>[\w-]+) (?<tw>\d+)\/(?<tc>\d+)\/(?<tt>\d+) (?<bytes>\d+) (?<t_state>[\w-]+) (?<actconn>\d+)\/(?<feconn>\d+)\/(?<beconn>\d+)\/(?<srv_conn>\d+)\/(?<retries>\d+) (?<srv_queue>\d+)\/(?<backend_queue>\d+)$/
  tag haproxy.tcp
  time_format %d/%B/%Y:%H:%M:%S
</source>
```

If we want to forward this log to stdout to test, we could add the following structure to our pipeline:

```text
<match haproxy.*>
  type stdout
</match>
```

## How to deploy Fluentd in Kubernetes

Fluentd is deployed as a daemonset in your Kubernetes cluster and will collect the logs from our various pods.

The logs will be processed by Fluentd by adding the context, modifying the structure of the logs and then forwarding it to log storage. The configuration file will be stored in a configmap.

With the help of tags you can easily specify how you want to route your logs based on the tags.

In the case of Kubernetes, most of our logs are sent in stdout. The docker engine generates a standardized location to collect the logs.

So, you are probably going to use tail to point to our Kubernetres log, which will add the the following part in our log stream pipeline:

```text
<source>
  type tail
  path /var/log/containers/*.log
  pos_file fluentd-docker.pos
  time_format %Y-%m-%dT%H:%M:%S
  tag kubernetes.*
  format json
  read_from_head true
</source>
```

Before going into details of how to build a pipeline with Fluentd, let's see how to deploy it in our Kubernetes cluster.

Firstly, you will need to utilize the following GitHub repository:

[fluent/fluentd-kubernetes-daemonset: Fluentd daemonset for Kubernetes and it Docker image (github.com)](https://github.com/fluent/fluentd-kubernetes-daemonset)

This project provides all the deployment files for Fluentd, but note that you will have a specific container image that will include a predefined plugin.

The current repository is providing predefined images, which include the following plugins:

- Elasticsearch 6 , and 7

- CloudWatch

- Forward

- GCS

- Graylog

- Kafka

- Kafka 3

- Kinesis

- Azureblob

- Loggly

- Logentries

- StarckDriver

- S3

- ...etc

If your target plugin does not provide any image, you will have to build it yourself.

I would then recommend you to build you new fluentd image based on this image:

```
fluent/fluentd-kubernetes-daemonset:v1.14-debian-forward-amd64-1
```

The idea is to make sure that you have enough plugins in our image to create your pipeline. So you can install several community plugins in your new container.

To allow Fluentd to run in a stable environment you will have to make sure to give it root permissions for the folders:

- /var /log with read rights ( it other folder where the logs would be stored)

- /var/log/pos\_file with write permissions

The default installation wil deploy Fluentd as a daemonset that will naturally deploy one Fluentd agent per node with the fluentd.conf files mounted in the container.

To ease the maintenance of our agents we will need to walk through how to move the config file into a configmap.

## Tutorial

Now that I’ve covered what Fluentd does, how to parse logs and how to deploy it into Kubernetes, let’s move on to the practical part. In this step-by-step tutorial, we will install Fluentd and use it to send the logs into Dynatrace.

You can access the tutorial via these two links:

- YouTube Video: [How to collect logs with Fluentd](https://www.youtube.com/watch?v=j76ozzIbuO8)

- GitHub tutorial: [How to collect logs with Fluentd](https://github.com/isItObservable/Episode-10---FluentD-tutorial)

## Go deeper

- [View the tutorial on FluentD on GitHub](https://github.com/isItObservable/Episode-10---FluentD-tutorial)
