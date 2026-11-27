---
title: "What is Stanza and what does it do?"
slug: what-is-stanza-and-what-does-it-do
category: otel
tags: [opentelemetry, kubernetes, observability]
youtubeId: Q5WX5eLnII0
publishDate: 2022-03-04
thumbnail: ../../assets/images/stanza.png
description: "Stanza is the most lightweight logging technology, developed by observIQ and now part of OpenTelemetry. Learn how to create a pipeline with Stanza’s operators and plugins."
---

[Stanza](https://github.com/observIQ/stanza) is a logging technology developed by observIQ and has recently been donated to [OpenTelemetry](https://www.dynatrace.com/news/blog/what-is-opentelemetry-2) to be embedded into the [OpenTelemetry Collector](/open-telemetry/traces/a-short-guide-to-opentelemetry). It is the most lightweight agent log collector and forwarder based on Go, but it’s still quite new in the logging space.

In this blog post, I’d like to introduce Stanza, its various operators and plugins, and share how to build a pipeline with it. All of its features will be potentially part of the OpenTelemetry Collector.

Let’s dive into it!

## Introduction to Stanza

Stanza is the new kid on the block in the logging space, and it’s more lightweight than its peers, Fluent Bit and FluentD.

Stanza can be utilized both in Kubernetes and traditional bare metal technology using Linux, Mac, and Windows. Similarly to other log agent collectors, Stanza requires you to define a pipeline describing the process of ingesting logs:

- Collect

- Parse

- Filter

- Forward (with output operator)

## How do you design a pipeline with Stanza?

A Stanza pipeline will be stored in a configuration file (for bare metal deployments) or a config map (Kubernetes). It is structured in a YAML format, i.e.,

```yaml
Pipeline:
Type: plugin name
Various arguments of the plugins:
Id: (optional)
Output:
...
Type:
...
```

Every step of the pipeline corresponds to an operator. In the example above, we defined two operators.

You can create a linear pipeline or a non-linear one.

The Linear pipeline follows the flow defined in our file:

```
Pipeline:
Operation 1
Operation 2
Operation 3
```

It’s possible, but not recommended, to change the order of the operations.

Each parameter uses standard parameters: output and ID. The output will define which step will follow this operation. ID is the name of the current operation.

It’s important to note that you always start with an input operation. In the following example, the first operation is related to collecting logs with the plugin: file\_input.

For example:

```yaml
type: json_parser # 2nd operator
type: stdout # 3rd operator
type: file_input # 1st operator
include:
my-log.json
output: json_parser
```

We can specify the id of the task:

```yaml
type: file_input
id: pperator_number_1
include:
my-log.json
output: operator_number_2
type: json_parser
id: operator_number_2
output: operator_number_3
type: stdout
id: operator_number_3
```

Stanza will produce a log stream in JSON format with the following structure:

```yaml
{
Timestamp:
Record: {
Label1: value 1;
Label2: value 2
message:" "
},
Resource: {
Ressource1: value1;
Ressource2: value2
},
Labels: {
},
Severity: int
}
```

Stanza has a default expression allowing access to one of the objects of the log stream:

- $timestamp = timestamp of the entry

- $record = content of the log stream

- $resource = resource of the logs stream

- $labels = label of the log stream

- Severity = severity of the log

- env() = helps you to access environment variables

You can apply various expression operators:

- Arithmetic: +, - , \*, /, % , \*\*

- Comparison: == , !=, \<, >, \<=, >=

- Logica : not or ! , and or && or or ||

- String: + , matches ( regexp), contains, startWith, endsWith

- Arrays: in, not in,

- Built-in functions: len (length) , all ( return true if all elements satisfy condition), none (do not satisfy), any, one, filter ( filter array by contention), map , count

## What is an operator in Stanza?

An operator in Stanza is a task of our log stream pipeline that helps us read from a file, parse the log, filter it and then push it to another log stream pipeline (similarly to the forwarding plugin of FluentD or Fluent Bit) and directly to the observability backend of your choice.

Similarly to the other agents on the market, there are several types of operators:

- Input

- Parser

- Transform

- Output

### Input operators

Multiple input operators can be used:

- File\_input

- forward\_input

- Windows event log

- Tcp

- Udp

- Journald

- AWS\_cloud\_watch

- Azure\_vent\_hub

- Azure\_log\_analytics

- Http\_input

- K8s\_event\_input

Each operator has its own set of parameters, except ID and output.

Please check the latest Stanza documentation to learn more about the operator that captures your interest: [stanza/docs/operators at master · observIQ/stanza (github.com)](https://github.com/observIQ/stanza/tree/master/docs/operators)

### Parser operators

Stanza has various parser operators. Most of them will have standard fields:

- parse\_from = which field to parse

- if = a field to set a condition on when to apply this parser

- on\_error = precising what to do in case of a parsing issue

- drop = drop the log stream

- send = to continue

- timestamp = to extract the time

- Severity = to extract the severity

#### Severity

Let’s look at an example of severity. This field has a mapping option to map values to a specific severity:

```yaml
pipeline:
  - type: file_input
    path: /var/log/test.log
  - type: regex_parser
    regex: '^Time=(?P<timestamp_field>\d{4}-\d{2}-\d{2}), Host=(?P<host>[^,]+), Type=(?P<type>.*)$'
    timestamp:
      parse_from: timestamp_field
      layout_type: strptime
      layout: '%Y-%m-%d'
    severity:
      parse_from: severity_field
      mapping:
        critical: 5xx
        error: 4xx
        info: 3xx
        debug: 2xx
```

Severity objects allow you to map a severity based on fixed values or a range of values:

```
mapping:
# single value to be parsed as "error"
error: oops
# list of values to be parsed as "warning"
warning:
hey!
YSK
# range of values to be parsed as "info"
info:
min: 300
max: 399
# special value representing the range 200-299, to be parsed as "debug"
debug: 2xx
# single value to be parsed as a custom level of 36
36: medium
# mix and match the above concepts
95:
really serious
min: 9001
max: 9050
5xx
```

#### CSV\_parser

Another important parser to look at is the CSV\_parser which will help you parse log streams or log keys. You'll be able to specify the log key names using the header field and you can also customize the delimiter.

```yaml
type: csv_parser
parse_from: message
header: 'id,severity,message'
header_delimiter: ","
delimiter: "\t"
```

##### Input record

```json
{
  "timestamp": "",
  "record": {
    "message": "1 debug \"Debug Message\""
  }
}
```

##### Output record

```json
{
  "timestamp": "",
  "record": {
    "id": "1",
    "severity": "debug",
    "message": "\"Debug Message\""
  }
}
```

If your CSV content contains a timestamp or severity that you want to use as a severity or time reference for your log stream, you can use the timestamp object or severity. 

#### Parse\_from

The parse\_from operator specifies which field contains our timestamp. If you have the logfmt format, you can imagine using the csv\_parser with a delimiter set to \\t. 

#### JSON\_parser

The JSON\_parser is used to extract JSON content stored in a specific field. You can utilize the if operator to validate that the content is JSON.

```yaml
type: json_parser
parse_from: message
timestamp:
parse_from: seconds_since_epoch
layout_type: epoch
layout: s
```

##### Input record

```json
{
  "timestamp": "",
  "record": {
    "message": "{\"key\": \"val\", \"seconds_since_epoch\": 1136214245}"
  }
}
```

Output record

```json
{
  "timestamp": "2006-01-02T15:04:05-07:00",
  "record": {
    "key": "val"
  }
}
```

For example:

```yaml
Pipeline:
Type: file_input
Path: /var/log.*.log
Type: json_parser
If: $record matches "^{.*}$"
```

On top of the CSV and JSON parser, Stanza provides more parser plugins:

- Regexp\_parser

- Syslog\_parser to parse logs in syslog format

- Severity\_parser

- Time\_parser

- XML\_parser

- Uri\_parser

- Key\_value\_parser

### Transform operators

Stanza has operators to allow you to filter, add extra metadata, restructure logs, and more.

Let’s have a look at a few useful operators:

- Rate\_limit

- Filter

- Route

- Metadata

- Restructure

- Host\_metadata

- K8s\_metadata\_decorator

- Add

- Copy

#### Rate\_limit

Rate\_limit is an operator that helps you limit the rate of logs that can pass through.

If your backend solution allows a certain number of logs/s to be ingested, then this operator will allow you to limit the traffic pushed to your output plugin.

#### Filter

Filter helps you to filter log streams to limit to log stream respecting the condition:

```yaml
Type: filter
Expr: $record.logkey1 contains "isitobservable"
```

In the example above, all the logs containing “isitobservable” will be dropped. You can also filter based on labels, as you can see below:

```yaml
Type: filter
Expr: $labels.namesapce == "istio-system"
```

#### Route

Route is a very important operator because you can create different routes in your pipeline based on certain conditions. For example:

- type: router

  routes:

  output: my\_json\_parser

  expr: '$.format == "json"'

  output: my\_syslog\_parser

  expr: '$.format == "syslog"'

  output: my\_csv\_parser

  expr: '$.format == "csv"'

  output: my\_xml\_parser

  expr: '$.format == "xml"'

  Default: default\_parser

#### Metadata

Metadata is an operator that will help you to enrich your log stream by adding labels and resources. Combining it with expr enables you to create dynamic metadata.

```yaml
type: metadata
output: metadata_receiver
labels:
environment: 'EXPR( $.environment == "production" ? "prod" : "dev" )'
```

#### Restructure

Restructure is an operator that enables you to change the record of your logs by adding, dropping, and moving fields.

Restructure takes a list of operations specified with “ops”. It accepts the following operations: add, move, retain, remove, flatter.

Add and remove require no explanation, so let’s look at the other operations in more detail.

Retain is used to specify which fields you would like to keep; the rest will be removed

```yaml
type: restructure
ops:
retain:
"key1"
"key2"
```

##### Input record

```json
{
  "key1": "val1",
  "key2": "val2",
  "key3": "val3",
  "key4": "val4"
}
```

Output record

```json
{
  "key1": "val1",
  "key2": "val2"
}
```

Move is used to rename fields.

Flatten will move fields having a JSON constant to the partner level.

```yaml
type: restructure
ops:
flatten: "key1"
```

##### Input record

```json
{
  "key1": {
    "nested1": "nestedval1",
    "nested2": "nestedval2"
  },
  "key2": "val2"
}
```

##### Output record

```json
{
  "nested1": "nestedval1",
  "nested2": "nestedval2",
  "key2": "val2"
}
```

#### Host Metadata

To add to your log stream host information (IP address, hostname) as a resource of our log stream,

#### K8s\_metadata\_decorator

This operator adds labels and annotations to the log stream by interacting with the k8s API.

To get efficient results, you'll need to specify the namespace and the pod name.

You can customize the name of the fields containing your namespace or pod with:

- Namespace\_field (namespace)

- Pod\_name\_field (defailt pod\_name)

For example:

```yaml
type: k8s_metadata_decorator
```

##### Input record

```json
{
  "timestamp": "",
  "record": {
    "namespace": "my-namespace",
    "pod_name": "samplepod-6cdcf6bf9d-f4f9n"
  }
}
```

##### Output record

```json
{
  "timestamp": "",
  "labels": {
    "k8s_ns_annotation/addonmanager.kubernetes.io/mode": "Reconcile",
    "k8s_ns_annotation/control-plane": "true",
    "k8s_ns_annotation/kubernetes.io/cluster-service": "true",
    "k8s_ns_label/addonmanager.kubernetes.io/mode": "Reconcile",
    "k8s_ns_label/control-plane": "true",
    "k8s_ns_label/kubernetes.io/cluster-service": "true",
    "k8s_pod_annotation/k8s-app": "dashboard-metrics-scraper",
    "k8s_pod_annotation/pod-template-hash": "5f44bbb8b5",
    "k8s_pod_label/k8s-app": "dashboard-metrics-scraper",
    "k8s_pod_label/pod-template-hash": "5f44bbb8b5"
  },
  "record": {
    "namespace": "my-namespace",
    "pod_name": "samplepod-6cdcf6bf9d-f4f9n"
  }
}
```

#### Add

Add new fields, resources, or labels to your log stream.

#### Copy

Copy is used to copy a value from a record to resources, labels, or records.

### Output operators

Stanza also utilizes output operators to specify where the parsed logs should be forwarded. Here are the most common ones:

- Stdout

- File

- Elasticsearch

- Google Cloud Logging

- Forward

- Newrelic

## What is a plugin in Stanza?

In Stanza, a plugin is a template containing a set of operators. You can create a separate YAML file for each of your templates.

This template is loaded in Stanza by either:

- Adding the file to the \<home stanza>/plugins

- Or by using a folder of your choice with the argument: –plugin\_dir

Many predefined plugins already exist, which you can find here: [stanza-plugins/plugins at master · observIQ/stanza-plugins (github.com)](https://github.com/observIQ/stanza-plugins/tree/master/plugins)

Let’s look at an example. Say we wanted to parse NGINX extended logs. Here’s what the pipeline would look like:

```yaml
version: 0.0.15
title: Nginx
description: Log parser for Nginx
min_stanza_version: 0.13.12
supported_platforms:
- linux
- windows
- macos
- kubernetes
Parameters:
- name: path
label: path
description: path to nginx file
type: string
default: "/var/log/nginx/access.log*"
pipeline:
- type: file_input
Labels:
Log_type: nginx
include:
- {{ .path }}
- type: regex_parser
regex: '(?P<ip>\S+)\s+\[(?P<time_local>[^\]]*)\]\s+(?P<method>\S+)\s+(?P<request>\S+)\s+(?P<httpversion>\S*)\s+(?P<status>\S*)\s+(?P<bytes_sent>\S*)\s+(?P<responsetime>\S*)\s+(?P<proxy>\S*)\s+(?P<upstream_responsetime>\S*)\s+(?P<resourcename>\S*)\s+(?P<upstream_status>\S*)\s+(?P<ingress_name>\S*)\s+(?P<resource_type>\S*)\s+(?P<resource_namespace>\S*)\s+(?P<service>\w*)'
timestamp:
parse_from: time_local
layout: '%d/%b/%Y:%H:%M:%S %z'
severity:
parse_from: status
preserve_to: status
mapping:
error: "4xx"
info:
- min: 300
max: 399
debug: 200
output: {{ .output }}
```

Once loaded i can use the plugin:

```yaml
Pipeline:
Type: nginx
Path: dedede.log
Type: stdout
```

So Stanza will first look if there is a pre-built plugin for NGINX. If not, it will look at the plugin folder and generate the new operator on the fly.

Stanza also provides a utility helping us to package our plugins into a Configmap for Kubernetes deployments: [https://github.com/observIQ/st...](https://github.com/observIQ/stanza-plugins/tree/master/dev/k8s)

Plugins can be added in a configmap. This means you will have one configmap with your pipeline and one configmap for the extensions.

## Tutorial

This tutorial will collect Kubernetes logs and push the modified log stream to Dynatrace.

For this tutorial, we will need:

- A Kubernetes cluster

- An NGINX ingress controller to help us route the traffic to the right services

- A demo application, in our case the Google Hipster Shop

- A Dynatrace tenant

- A deployed local Dynatrace active gate to push our logs.

For this tutorial, I have created the Dynatrace output operator that will transform the log stream to the Dynatrace format and interact with the log ingest API.

We will create a simple pipeline based on a predesigned plugin that will collect the logs from the container, add the Kubernetes metadata, and then use the dynatrace\_output operator.

## Go deeper

- [View the tutorial on Stanza on GitHub](https://github.com/isItObservable/Stanza)
