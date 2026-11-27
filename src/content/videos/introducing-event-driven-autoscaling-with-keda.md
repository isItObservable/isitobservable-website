---
title: "Introducing event-driven autoscaling with KEDA"
slug: introducing-event-driven-autoscaling-with-keda
category: k8s
tags: [kubernetes, observability]
youtubeId: E_tkH5Gvn_g
publishDate: 2022-07-22
thumbnail: ../../assets/images/kedã.png
description: "KEDA (Kubernetes Event-Driven Autoscaling) can help you drive the scaling of any container in Kubernetes based on the number of events needing to be processed."
---

As discussed in my previous blog post on [How to autoscale in Kubernetes](/observability/kubernetes/how-to-autoscale-in-kubernetes-and-how-to-observe-scaling-decisions), autoscaling is very helpful in Kubernetes to ensure that your application can grow based on its workload.

Today, we will focus on KEDA, a CNCF project and Kubernetes event-driven autoscaler that can help you scale your solution based on external events. Furthermore, we will look at how you can collect observability signals from KEDA and understand the autoscaler’s behavior.

Here’s a quick overview of what we will cover:

- Introduction to KEDA

- The various CRDs provided by KEDA

- How to collect metrics from KEDA

- Introducing two scalers: Metric API and Prometheus

- How to observe KEDA

- Tutorial

Today this episode will focus on how to autoscale our workload based on external events. We will take advantage of this episode to introduce an amazing CNCF project: KEDA

P.S.: In my video, I also had the opportunity to interview Zbyněk Roubalík, the maintainer of the KEDA project. Watch the video here to learn more about the behind-the-scenes of KEDA.

## Introduction to KEDA

Kubernetes allows you to autoscale in various ways: horizontally, vertically, or by nodes.

All autoscaling solutions have the disadvantage of supporting only standard Kubernetes objects (deployment, statefullset, replicaset) and relying on the metrics server.

Therefore, you need to use a metric adapter compatible with your data source to build autoscaling rules based on custom metrics. If you have no metric adapter available, you need to stick to resource metrics (CPU or memory).

Another disadvantage of standard autoscaling solutions is that there isn’t a way of observing their behavior, so you need to devise your own set of KPIs to see if they're behaving as expected. So if HPA or VPA aren’t working as expected for some obscure reason, you won’t receive precise alerts.

The good news is that KEDA is here to solve these issues.

KEDA is a CNCF project that will autoscale your workload based on events. In short, it’s an event-driven autoscaler (as the name suggests: Kubernetes Event-Driven Autoscaling)

KEDA is a lightweight operator for the Kubernetes cluster and manages your auto-scaling process by providing the right metric server and the right [Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/).

### How KEDA works

KEDA performs two key roles within Kubernetes:

- Agent\
  KEDA provides a KEDA-operator that manages the autoscaling of our Kubernetes objects

- Metrics \
  KEDA acts as a [Kubernetes metrics server](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#support-for-custom-metrics) that exposes rich event data provided by an external solution (scalers). With the help of the event, it drives the HPA to scale. KEDA can scale standard K8S objects and also custom CRS.

### The architecture of KEDA

KEDA is composed of several components:

- **The Metric Adapter** that behaves like a metric server that will be use by the HPA

- **The KEDA operator** that interacts with a third-party solution to collect events on a third-party solution with the help of a scler, and report the metric to the metric adapter

- **The KEDA CRDs** through which KEDA manages the HPA by defining an autoscaling policy.

![KEDA architecture components](~/assets/images/Keda.jpg)

KEDA has a wide range of [scalers](https://keda.sh/docs/2.17/scalers/) that can both detect if a deployment should be activated or deactivated, and feed custom metrics for a specific event source. The following scalers are available:

[ActiveMQ](https://keda.sh/docs/2.7/scalers/activemq/)

[ActiveMQ Artemis](https://keda.sh/docs/2.7/scalers/artemis/)

[Apache Kafka](https://keda.sh/docs/2.7/scalers/apache-kafka/) 

[AWS CloudWatch](https://keda.sh/docs/2.7/scalers/aws-cloudwatch/)

[AWS DynamoDB](https://keda.sh/docs/2.7/scalers/aws-dynamodb/)

[AWS Kinesis Stream](https://keda.sh/docs/2.7/scalers/aws-kinesis/)

[Google Cloud Platform](https://keda.sh/docs/2.7/scalers/gcp-stackdriver/)

[Stackdriver](https://keda.sh/docs/2.7/scalers/gcp-stackdriver/)

[Google Cloud Platform](https://keda.sh/docs/2.7/scalers/gcp-storage/)

[Metrics API](https://keda.sh/docs/2.7/scalers/metrics-api/)

[Prometheus](https://keda.sh/docs/2.7/scalers/prometheus/)

[MongoDB](https://keda.sh/docs/2.7/scalers/mongodb/)

[MSSQL](https://keda.sh/docs/2.7/scalers/mssql/)

…etc and more

## CRDs provided by KEDA

Once KEDA is deployed, it will enrich your k8s cluster by adding new CRDs:

- scaledObjects

- ScaledJobs

- triggerAuthentications

- clusterTriggerAuthentications

**ScaledObject** allows you to manage the autoscaling of Kubernetes deployments, statefulSet, and any Custom Resource that defines/scales subresources.

**ScaledJobs** represents the mapping between an event source and a Kubernetes job. This helps you figure out the number of jobs based on events.

The overall concept of KEDA is to collect metrics from an external data source with the help of a scaler. Each scaler has its specific way of authenticating to the external datasource. To mutualize and optimize the authentication process, KEDA provides 2 CRDs**, TriggerAuthentication,** or **ClusterTriggerAuthentication,** which contain the authentication configuration or secrets to monitor the event source.

### ScaledObject specification

Here is an example of ScaledObject

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
name: ftonend-scaler
spec:
scaleTargetRef:
name: frontend
kind deployment
apiVersion: apps/v1
minReplicaCount: 1
maxReplicaCount: 10
pollingInterval: 30
fallback:
failureThreshold: 3
replicas: 6
advanced:
restoreToOriginalReplicaCount: true
horizontalPodAutoscalerConfig:
behavior:
scaleDown:
stabilizationWindowSeconds: 300
policies:
- type: Percent
value: 100
periodSeconds: 15
triggers:
- type:...
authenticationRef:
name: trigger-auth-service
```

In the KEDA object, we can find similar settings as in the definition of the HPA in the horizontalPodAutoscalingConfig. Th.spec.ScaleTargetRef section holds the reference to the target resource, i.e., Deployment, StatefulSet, or Custom Resource.

If you're using a ScaledObject for a Deployment, then you won’t need to precise the API and the kind ( Deployment is the default kind).

We also define the definition of the HPA with the number of min and max replicas.

KEDA provides other settings to manage specific situations, like the PoolingInterval that defines the interval to check the metrics

Another great feature is the ability to handle the situation where the scaler is not providing any metrics anymore because it’s down or saturated. This can be configured in the fallback section. It defines several replicas to fall back to if a scaler is in an error state.

KEDA will keep track of the number of consecutive times each scaler has failed to get metrics from its source. Once that value passes the failureThreshold, instead of not propagating a metric to the HPA (the default error behavior), the scaler will, instead, return a normalized metric using this formula:

```
target metric value * fallback replicas
```

In the trigger section, you can define the events that trigger the autoscaling process. You can refer to the TriggerAuthentification object to help you to authenticate to your third-party solution (through a scaler).

One exciting feature of KEDA is the ability to pause autoscaling, which is useful if you have any maintenance operations to deliver on your cluster.

This is done by adding an annotation to your scaledboject:

```yaml
autoscaling.KEDA.sh/paused-replicas: "0"
```

The presence of this annotation will pause autoscaling no matter what number of replicas is provided. The above annotation will scale your current workload to 0 replicas and pause autoscaling. You can set the value of replicas for an object to be paused at any arbitrary number. To enable autoscaling again, simply remove the annotation from the ScaledObjectdefinition.

It’s in the triggers that we configure the information to our scaler, i.e.:

```yaml
triggers:
  - type: metrics-api
    metadata:
      targetValue: "100"
      url: '<tenant-baseurl>/api/v2/metrics/query?metricSelector=builtin:service.requestCount.total:filter(and(in("dt.entity.service",entitySelector("type(service),entityName(~"greeting-service~")")))):splitBy():sum:timeshift(-3m):rollup(avg,3m):last'
      valueLocation: 'result.0.data.0.values.0'
      authMode: apiKey
      keyParamName: Authorization
    authenticationRef:
      name: keda-auth
```

### ScaledJobs

An alternative to [scaling event-driven code as deployments](https://keda.sh/docs/2.7/concepts/scaling-deployments/) is running and scaling your code as Kubernetes Jobs.

This option is best for processing long-running executions. The job will initialize, pull a single event from the message source, and process to completion and terminate.

For example, if you wanted to use KEDA to run a job for each message that lands on a RabbitMQ queue, the flow may be:

- When no messages are awaiting processing, no jobs are created.

- When a message arrives on the queue, KEDA creates a job.

- When the job starts running, it pulls a single message and processes it to completion.

- As additional messages arrive, additional jobs are created. Each job processes a single message to completion.

- Periodically remove completed/failed jobs by the SuccessfulJobsHistoryLimit and FailedJobsHistoryLimit.

Here is an example of ScaledJob:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
name: rabbit-storage-queue-consumer
namespace: default
spec:
jobTargetRef
parallelism: 3
completions: 3
activeDeadlineSeconds: 600
template:
spec:
containers:
- name: rabbit-storage-queue-receive
image: tsuyoshiushio/rabbitmq-client:dev
imagePullPolicy: Always
command: ["receive"]
envFrom:
- secretRef:
name: rabbit-storage-queue-secret
restartPolicy: Never
backoffLimit: 4
pollingInterval: 5
cooldownPeriod: 30
maxReplicaCount: 30
triggers:
- type: rabbit-queue
authenticationRef:
name: rabbit-queue-auth
metadata:
queueName: "test"
```

ScaledJob offers various settings to define:

- The max duration of a job, with activedeadlinseconds

- The number of retries before failing the job

- The event that triggers the job

- The number of parallelism, and more.

It’s a great feature, but you need to define your jobs to handle only one event at a time.

You'll then delegate the execution of the required jobs to KEDA

### TriggerAuthentication and ClusterTriggerAuthentication

Most of the scalers that we're going to use will require authentication. You can manage your credentials using Secrets or Configmap, but KEDA does not allow you to refer directly in the definition of your ScaledObject or ScaledJob.

The only way is to use reference to container information, which is where managing your authentication tokens could become a nightmare. It makes it difficult to share auth between scaledObjects.

That is the reason why KEDA provides 2 CRDs to manage your credentials with your scalers:

TriggerAuthentication and ClusterTriggerAuthentification (at cluster level).

The other advantage is that TriggerAuthentication and ClusterTriggerAuthentification support several types of authentication mechanisms.

The idea is to define the triggerAuth object, as seen below:

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
name: rabbitmq-queue-auth
spec:
secretTargetRef:
- parameter: connection
name: rabbitmq-queue-secret
key: ConnectionString
```

And then make a reference to it the scaledObject:

```yaml
triggers:
- type: {scaler-type}
metadata:
param1: {some-value}
authenticationRef:
name: {trigger-authentication-name}
```

The authentication parameters can be pulled out of many sources:

- Environment variable

- Secrets

- Hashicorp vaults

- Azure Key vaults

- Pod authentication providers

### Scalers

The power of KEDA lies within a large number of scalers. Scalers are a rich source of information because they allow you to scale based on external data. KEDA has 50+ scalers for hyperscalers like AWS, and Azure, observability solutions like Prometheus, DataDog, and even scalers for ScaledJob scenarios.

As mentioned in the blog post on [autoscaling](/observability/kubernetes/how-to-autoscale-in-kubernetes-and-how-to-observe-scaling-decisions), HPA can use custom metrics, but it requires you to provide a metric adapter for third-party metrics. It can even require extra configuration to map the data to Kubernetes objects properly.

That is where KEDA makes your life easier.

Let’s have a look at 2 scalers in more detail: Prometheus and Metric API

## The Prometheus scaler

The Prometheus scaler is used to trigger scaling based on Prometheus metrics.

```yaml
triggers:
- type: prometheus
metadata:
# Required fields:
serverAddress: http://<prometheus-host>:9090
metricName: http_requests_total # Note: name to identify the metric, generated value would be `prometheus-http_requests_total`
query: sum(rate(http_requests_total{deployment="my-deployment"}[2m])) # Note: query must return a vector/scalar single element response
threshold: '100'
# Optional fields:
namespace: example-namespace # for namespaced queries, eg. Thanos
```

Defining the metric is relatively simple. You just need to specify the URL to your Prometheus server and the PromQL. If your Prometheus requires you to authenticate, you can create the authentication through TriggerAuthentication.

## The Metric API scaler

You can use the Metric API plugin to connect to any solution exposing metrics

```yaml
triggers:
- type: metrics-api
metadata:
targetValue: "8"
url: "http://api:3232/api/v1/stats"
valueLocation: "components.worker.tasks"
```

This allows you to build the right HTTP API call and extract the value you're interested in using the “valueLocation” field. It also handles several ways to authenticate to your API endpoint: API key-based, basic, or bearer authentication.

## How to observe KEDA

KEDA exposes metrics and events, helping you to understand what is currently happening in your autoscaling mechanism.

To keep track of your autoscaling scenario, KEDA provides two sources of data: events and metrics (in a Prometheus exporter).

### Events

KEDA emits multiple Kubernetes Events, as listed on the KEDA [documentation page for Kubernetes Events](https://keda.sh/docs/2.7/operate/events/).

Collecting those events in your observability solutions allows you to observe KEDA. In the tutorial, we will focus on the following ones:

- ScaledObjectCheckFailed

- KEDAScaleTargetActivated and failed

- KEDAScaleTargetDeactivated and failed

- KEDAScalerFailed

### Metrics

KEDA expose certain metrics to the metric server so you can query them with kubectl:

```bash
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1"
```

You can also query specific metrics:

```bash
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1/namespaces/YOUR_NAMESPACE/YOUR_METRIC_NAME"
```

You can also collect the metric from the scaledObject. KEDA updates it with certain information including the metric, so we can recover the metric name:

```bash
kubectl get scaledobject SCALEDOBJECT_NAME -n NAMESPACE -o jsonpath={.status.externalMetricNames}
```

### Prometheus metrics

The KEDA Metrics Adapter exposes Prometheus metrics which can be scraped on port 9022 (this can be changed by setting the metrics-port argument for the Metrics Adapter) at /metrics. The metrics collected in the Metrics Adapter are only active when the HPA is active (> 0 replicas).

The following metrics are gathered:

- KEDA\_metrics\_adapter\_scaler\_error\_totals - The total number of errors encountered for all scalers.

- KEDA\_metrics\_adapter\_scaled\_object\_error\_totals - The number of errors that have occurred for each scaled object.

- KEDA\_metrics\_adapter\_scaler\_errors - The number of errors that have occurred for each scaler.

- KEDA\_metrics\_adapter\_scaler\_metrics\_value- The current value for each scaler’s metric that would be used by the HPA in computing the target average.

## Tutorial

Now it’s time for the practical part! In this tutorial, I'll showcase using KEDA to autoscale a demo application based on Dynatrace metrics.

Here’s what you need to get started:

- A Kubernetes cluster

- KEDA

- A Dynatrace tenant

Follow the full tutorial on my YouTube video: [What is Keda?](https://www.youtube.com/watch?v=E_tkH5Gvn_g)

Or on GitHub: [isItObservable/Keda: repository for the Keda Tutorial (github.com)](https://github.com/isItObservable/Keda)

## Go deeper

- [View the tutorial on Keda on GitHub](https://github.com/isItObservable/Keda)
