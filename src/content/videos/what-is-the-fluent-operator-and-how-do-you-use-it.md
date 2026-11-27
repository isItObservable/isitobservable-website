---
title: "What is the Fluent Operator and how do you use it?"
slug: what-is-the-fluent-operator-and-how-do-you-use-it
category: k8s
tags: [kubernetes, fluentd, fluent-bit]
youtubeId: 8I6AnkTkeiI
publishDate: 2022-04-15
thumbnail: ../../assets/images/fluentoperator.png
description: "The Fluent Operator simplifies the maintenance of your log agents, especially when you combine Fluent Bit and Fluentd in your log pipeline."
---

The [Fluent Operator](https://github.com/fluent/fluent-operator) simplifies the maintenance of your log agents, especially when you combine Fluent Bit and Fluentd in your log pipeline.

This blog post will introduce you to the Fluent operator and share some best practices for its implementation. In the end, you'll find more information about the tutorial I built on how to use the Fluent Operator and all other relevant links.

Let’s start with a quick introduction to the two log agents before focusing on the Fluent Operator.

## Introduction to Fluentd and Fluent Bit

In some of my previous blog posts, I have already spoken at length about Fluentd and Fluent Bit, but here’s a quick summary of the differences and similarities between the two tools to get us started.

Fluent Bit and Fluentd are both log agents able to collect, filter, parse, and forward log streams to the observability backend of your choice.

The major differences between the two solutions are that:

- Fluent Bit is lightweight, built for cloud-native and more efficient in collecting and parsing logs

- Fluentd has multiple plugins to transform and forward the logs for any solution on the market

Ideally, we’d want to use Fluent Bit to collect and do most of the tasks in our log pipeline and utilize Fluentd to finalize the transformation of our logs by doing advanced processing and then forwarding the logs to our preferred solution.

Both log agents can be deployed in bare metal technology or within a Kubernetes cluster. They require building a log stream pipeline describing how we want to collect and process logs. This pipeline is stored in a configuration file (config map for Kubernetes).

Operating Fluentd or Fluent Bit requires managing the deployment of the log agent (usually deployed in Kubernetes using daemonset) and updating your various log stream pipelines by modifying the various configmaps.

When you combine Fluentd with Fluent Bit, you need to start managing different updates and doing them correctly. To simplify this process, Fluent has created the Fluent Operator.

## The Fluent Operator

The Fluent Operator allows you to manage the deployment of only Fluent Bit or the combination of Fluentd and Fluent Bit.

The fluent community recommends using Fluentd to do advanced processing on your logs. The operator will deploy Fluent Bit in a daemonset to help us collect logs from our cluster. In the case of Fluentd, the operator will deploy it as a statefulset to finalize the log stream pipeline.

This means that the operator will come with several Custom Resource Definitions (CRDs) to manage for both Fluent Bit and Fluentd:

- Deployment

- The configuration that links the various steps of the log stream pipeline

- Define input steps

- Define parser steps

- Define filter steps

- Define output steps

## The Fluent Bit CRDs

The Fluent Operator provides specific CRDs to manage your Fluent Bit deployment and pipeline. Put simply, CRDs create new k8s objects that the Fluent Operator will watch to update the log stream pipeline and deployment. You can find an extensive list of all [CRDs on the Fluent Operator documentation on GitHub](https://github.com/fluent/fluent-operator#fluent-bit).

Here’s an example of a Fluent Bit object (from the CRD Fluent Bit, which defines the Fluent Bit DaemonSet and its configuration).

```yaml
apiVersion: fluentbit.fluent.io/v1alpha2
kind: FluentBit
metadata:
  name: fluent-bit
  namespace: kubesphere-logging-system
  labels:
    app.kubernetes.io/name: fluent-bit
spec:
  image: kubesphere/fluent-bit:v1.8.3
  positionDB:
    hostPath:
      path: /var/lib/fluent-bit/
  resources:
    requests:
      cpu: 10m
      memory: 25Mi
    limits:
      cpu: 500m
      memory: 200Mi
  fluentBitConfigName: fluent-bit-config
  tolerations:
    - operator: Exists
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: node-role.kubernetes.io/edge
                operator: DoesNotExist
```

This object includes the default Fluent Bit image (kubesphere/fluent-bit), but you can use a custom one if needed. However, remember that it’s not a standard Fluent Bit image because it requires the Fluent Bit Operator to work and handle the reloading of dynamic configuration.

The Fluent Bit object specifies how to deploy the log agents and links to a configuration object that will map the various log stream pipeline steps. The configuration would be defined at the cluster level with the help of ClusterFluentBitConfig. You can limit the scope of your pipeline by specifying the namespace field.

Here is an example of a CLusterFluentBitConfig:

```yaml
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterFluentBitConfig
metadata:
  name: fluent-bit-config
  labels:
    app.kubernetes.io/name: fluent-bit
spec:
  service:
    parsersFile: parsers.conf
  inputSelector:
    matchLabels:
      fluentbit.fluent.io/enabled: "true"
  filterSelector:
    matchLabels:
      fluentbit.fluent.io/enabled: "true"
  outputSelector:
    matchLabels:
      fluentbit.fluent.io/enabled: "true"
```

The clusterconfig will attach the logs stream steps with the help of label selector.

![Fluent bit operator workflow](~/assets/images/fluent-bit-operator-workflow-1.svg)

Image source: [https://github.com/fluent/fluent-operator/raw/master/docs/images/fluent-bit-operator-workflow.svg](https://github.com/fluent/fluent-operator/raw/master/docs/images/fluent-bit-operator-workflow.svg)

Those labels must be specified on each Fluent Bit object describing your pipeline steps.

You define how to map your:

- Input steps using inputselector

- Filter steps using filterselector

- Parser steps using parserselector

- Output steps using outputselector

Each step of the pipeline will then be split into big steps of your log stream:

- Input by creating a ClusterInput object

- Parser by creating a ClusterParser ( that could be also part as one of the operations of the filter task)

- Filter with the ClusterFilter

- And, lastly, ClusterOutput for the output.

The operator watches the various objects and steps of the pipeline to create secrets containing the actual logs stream pipeline. The deployed daemonset refers to those secrets.

So defining a Fluent Bit pipeline with the Fluent Operator would be different from a traditional Fluent Bit pipeline.

For example, here is a traditional Fluent Bit pipeline:

```yaml
    [INPUT]
        Name tail
        Path /var/log/containers/*.log
        Parser docker
        Tag kube.*
        Mem_Buf_Limit 5MB
        Skip_Long_Lines On
    [INPUT]
        Name systemd
        Tag host.*
        Systemd_Filter _SYSTEMD_UNIT=kubelet.service
        Read_From_Tail On*
    [FILTER]
        Name modify
        Match *
        Rename message content
        Rename log content
    [FILTER]
        Name kubernetes
        Match kube.*
        Merge_Log On
        Merge_Log_Trim On
        Labels Off
        Annotations Off
        K8S-Logging.Parser Off
        K8S-Logging.Exclude Off
    [FILTER]
        Name nest
        Match kube.*
        Operation lift
        Nested_under kubernetes
        Add_prefix   kubernetes_
```

In the fluent operator each block of this pipeline will represent a specific CRD, for example, the cluster input:

```yaml
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterInput
metadata:
  name: tail
  labels:
    fluentbit.fluent.io/enabled: "true"
    fluentbit.fluent.io/component: logging
spec:
  tail:
    tag: kube.*
    path: /var/log/containers/*.log
    parser: docker
    refreshIntervalSeconds: 10
    memBufLimit: 5MB
    skipLongLines: true
    db: /fluent-bit/tail/pos.db
    dbSync: Normal
```

Clustfilter:

```yaml
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterFilter
metadata:
  name: kubeletfilter
  labels:
    fluentbit.fluent.io/enabled: "true"
    fluentbit.fluent.io/component: logging
spec:
  match: service.kubelet
  filters:
    - modify:
        rules:
          - rename:
              message: content
              log: content
```

And cluster output using stdout:

```yaml
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterOutput
metadata:
  name: fluentd-stdout-kub
  labels:
    fluentbit.fluent.io/enabled: "true"
spec:
  stdout:
    format: json_stream
  match: kube.*
```

Every update made on each CRD will automatically update the Fluent Bit agents running.

As of now, not all Fluent Bit plugins are available in the Fluent Operator, but we could expect to have more plugins soon.

## The Fluentd CRDs

Fluentd CRDs follow a similar logic to the Fluent Bit CRDs. You need to create a Fluentd object that will specify the deployment of your Fluentd agent. The significant difference is that you have to define how to receive logs from Fluent Bit:

```yaml
apiVersion: Fluentd.fluent.io/v1alpha1
kind: Fluentd
metadata:
name: Fluentd
namespace: kubesphere-logging-system
labels:
app.kubernetes.io/name: Fluentd
spec:
globalInputs:
- forward:
bind: 0.0.0.0
port: 24224
replicas: 1
image: kubesphere/Fluentd:v1.14.4
FluentdCfgSelector:
matchLabels:
config.Fluentd.fluent.io/enabled: "true"
```

Similarly to the Fluent Bit object, you can customize the image, but remember that it’s a specific instance of Fluentd designed for the operator.

The Fluentd object specifies which configuration to use. There are two ways: ClusterFluentdConfig at the cluster level or FluentdConfig at the namespace level.

Here’s an example of a ClusterFluentdConfig:

```yaml
apiVersion: Fluentd.fluent.io/v1alpha1
kind: ClusterFluentdConfig
metadata:
name: Fluentd-config
labels:
config.Fluentd.fluent.io/enabled: "true"
spec:
watchedNamespaces:
- kube-system
- kubesphere-monitoring-system
clusterOutputSelector:
matchLabels:
output.Fluentd.fluent.io/enabled: "true"
```

You can set limits on specific namespaces here using “watchedNamespaces.” Similarly to Fluent Bit CRDs, you'll map your pipeline using label selectors.

Because Fluentd acts as a log forwarder in the Fluent Operator, you only have a filter and output steps available.

So, the idea is to collect, parse, and filter your logs with FluentBit and then forward them to Fluentd to take advantage of its filter and output plugins.

That is why Fluentd only has the [following pipeline CRDs](https://github.com/fluent/fluent-operator#fluentd): ClusterOutput that will need to be used in a Cluster level (when using ClusterFluentdConfig) or Output when using a namespace level (FluentdConfig), ClusterFilter or Filter.

Here is an example of ClusterOutput:

```yaml
apiVersion: Fluentd.fluent.io/v1alpha1
kind: ClusterOutput
metadata:
name: Fluentd-output-es
labels:
output.Fluentd.fluent.io/enabled: "true"
spec:
outputs:
- elasticsearch:
host: elasticsearch-logging-data.kubesphere-logging-system.svc
port: 9200
logstashFormat: true
logstashPrefix: ks-logstash-log
```

## Best practices for using the Fluent Operator

### Adding more plugins

Currently, the Fluent Operator doesn’t allow adding extra plugins, and only a few of them are supported (see the full list [here](https://github.com/fluent/fluent-operator#fluent-bit-1)).

Since our pipeline is built upon multiple CRDs, providing a new image (as you would do in a traditional Fluentd deployment) won’t help you. CRDs need to be updated by adding the new definition of the parameters of our new plugin.

If you need a specific Fluentd plugin that is not supported, I recommend deploying Fluentd manually (without an operator) and configuring your Fluent Bit pipeline to forward the log stream to your custom Fluentd deployment.

### Designing your log stream pipeline

When designing your log stream pipeline, I would recommend defining your inputs first and then defining only one output (stdout).

Then look at the produced logs in the logs of Fluent Bit and add filters and validate your changes.

Do small changes and validate them. This will avoid building a complex pipeline and spending lots of time debugging it.

### Save time with the Regex parser

Another small tip that could save you a lot of time is to test your Regex parser using this website: [Rubular](https://rubular.com/r/X7BH0M4Ivm).

This will work because the Regex parser used by Fluent Bit is a Ruby regular expression.

## Tutorial

Now let’s jump into the tutorial!

We will deploy the Fluent Operator and configure and design a pipeline that will collect logs from our pods and send them to Dynatrace.

Before you start, make sure you fulfill these requirements:

- A Kubernetes cluster

- An NGINX ingress controller

- The [Google hipster-shop](https://github.com/lightstep/hipster-shop)

- K6 to generate traffic and produce logs

- The Fluent Operator

- A Dynatrace tenant and a local Dynatrace active Gate in our cluster

Access the full tutorial here:

- Link to video on YouTube: [What is the Fluent Operator and how do you use it?](https://youtu.be/8I6AnkTkeiI)

- Link to GitHub repository: [isItObservable/FluentOperator](https://github.com/isItObservable/FluentOperator)

## Go deeper

- [View the tutorial on the Fluent Operator on GitHub](https://github.com/isItObservable/FluentOperator)
