---
craftId: 255699
title: What is the Keptn Lifecycle Toolkit?
subline: Keptn is an event-driven framework that utilizes [CloudEvents](https://cloudevents.io/) to communicate with different tools for specific events, for example, testing.
date: 2023-02-20T09:58:00Z
author: giulia-di-pietro
topics:
  - kubernetes
  - observability
  - site-reliability-engineering
  - prometheus
image:
  src: ~/assets/images/keptn.png
  title: What is the Keptn lifecycle Toolkit?
  alt: null
youtube: https://www.youtube.com/watch?v=Uvg4uG8AbFg
related:
  - events/non-standard-slos-beyond-availability
  - events/what-happened-at-kubecon-north-america-2022
  - observability/service-mesh/what-is-linkerd-and-can-you-observe-it
  - site-reliability-engineering/getting-started-with-sre-part-2
  - site-reliability-engineering/get-started-with-sre-part-1
  - observability/kubernetes/how-to-collect-logs-with-fluentd
  - observability/kubernetes/how-to-autoscale-in-kubernetes-and-how-to-observe-scaling-decisions
  - observability/kubernetes/introducing-event-driven-autoscaling-with-keda
goDeeper:
  - text: GitHub repository
    url: https://github.com/isItObservable/keptn-lifecycle-Toolkit
---

This episode and blog post of Is It Observable is dedicated to a CNCF project you may already know about: [Keptn](https://keptn.sh/). Mainly, I'll talk about the [Keptn Lifecycle Toolkit](https://lifecycle.keptn.sh/) and introduce the following topics:

- The challenges we face when deploying applications in Kubernetes.

- What the Keptn Lifecycle Toolkit is.

- Which CRDs it adds to your cluster.

- How to create pre and post-checks.

- What observability data Keptn provides out of the box.

As usual, I’ll wrap up the episode with a tutorial that shows you how to get started with Keptn.

## Deploying applications in Kubernetes

Do you remember how we used to manage deployments a few years back?

First, we used to handle only one or two releases per year while working in the same Git or SVN repository. Code would be built and deployed to ship it into the infrastructure, and we would run tests to tune the environment and adjust its size there.

Nowadays, we're more Agile. Every team is in charge of a component or a microservice, so everyone has their repository with their own validation set. Deployments are separate from component to component, but we need to run validation when integrating them and figure out the right autoscaling policy and observability.

When deploying an application in [Kubernetes](https://www.dynatrace.com/news/blog/what-is-kubernetes-2/), you must create one deployment file per [microservice](https://www.dynatrace.com/perform-2022-ondemand/breakouts/extend-microservices-observability/). This deployment file includes the following:

- One or several containers.

- A health probe that Kubernetes will use to route the traffic to the right pod.

- A readiness probe to let Kubernetes determine if your pod is running.

- The number of required replicas.

- A Kubernetes service for the network layer.

In the end, Kubernetes will automatically check if the required objects used by your workload are already deployed. Once the container is created and started, Kubernetes will interact with the readiness probe and the health probe to update your service's state and network route.

Since Kubernetes has no notion of application or dependency, if you deploy a pod that requires a specific database and this one hasn’t been deployed, it will crash. After repeated crashes, you'll get the error: crashloopbackoff.

The correct deployment sequence is crucial to avoid this from happening. You can also run tests within your CI/CD process to validate the deployment with tools like:

- Jenkins

- GitHub Actions

- Gitlab

- AzureDevOps

- Spinnaker

- ArgoCD

- And more.

Most CI/CD solutions allow you to build tasks that interact with one of your tools for deployment, security scans, tests, and more. Integrations may already exist within the tooling, but sometimes you need to build your own.

Consequently, once you have created a reliable pipeline, you usually copy pieces of your pipeline to reuse them in other project pipelines. After some time, you realize that this copy-pasted piece is in most of our pipeline.

It becomes an issue when you change tooling because you need to update all your pipelines for your organization.

And thus, Keptn was created.

Keptn is an event-driven framework that utilizes [CloudEvents](https://cloudevents.io/) to communicate with different tools for specific events, for example, testing. If you need to change a tool, you can just subscribe to the new one to Keptn. You can also use Keptn for its quality gates feature, which evaluates the success of a task based on [SRE methodology](/site-reliability-engineering/get-started-with-sre-part-1). And it provides production use cases to manage your remediation or canary releases.

Several months ago, Keptn released an LTS version, v1.0. Currently, the official release is 1.1.0.

The Keptn team tries to make onboarding easier and faster for cloud-native applications. So they decided to create the Keptn Lifecycle Toolkit, designed for applications running in a Kubernetes cluster. Let’s have a look at this tool in more detail.

## What is the Keptn Lifecycle Toolkit?

The Keptn Lifecycle Toolkit (KLT) is an operator designed to help teams manage their deployments in Kubernetes by adding the notion of “applications.”

Keptn defines an application by attaching workloads to it. This helps you:

- Add pre-evaluation before deploying any workload or application in our cluster.

- Find out when an application (not workload) is ready and running.

- Check the application health in a declarative way.

- Standardize pre/post-deployment tasks.

- Provide out-of-the-box observability related to your deployment cycle.

The beauty of Keptn is that it does not require any specific configuration. All you need to do is define your application, add particular annotations to the workload, and label the namespace where the Keptn Lifecycle Toolkit will observe your deployments and applications.

Keptn will only check the application deployed in namespaces having a specific annotation:

```yaml
keptn.sh/lifecycle-toolkit: "enabled"
```

Then you simply need to add the right annotation to your workload:

```yaml
keptn.sh/app: myAwesomeAppName
keptn.sh/workload: myAwesomeWorkload
keptn.sh/version: myAwesomeWorkloadVersion
```

Or you can also use the Kubernetes-recommended labels to annotate your workload:

```yaml
app.Kubernetes.io/part-of: myAwesomeAppName
app.Kubernetes.io/name: myAwesomeWorkload
app.Kubernetes.io/version: myAwesomeWorkloadVersion
```

Keptn will first look for the Keptn annotations/labels; if it does not find them, it will look at the Kubernetes labels.

As you can see, Keptn also keeps track of the version of your workload. You can define, for example, that application 1.0 is made of workload A, version 0.20, and workload B with version 0.40, etc. That is why the version number needs to be annotated.

If you don’t define any version number in your annotations, Keptn will use the version number of your container only if you have only one container in your workload.

KLT has a great feature that allows you to create pre-deployment and post-deployment checks for our workload or application. To do this, you need to add the following annotations to your workload:

```yaml
keptn.sh/pre-deployment-tasks: verify-infrastructure-problems
keptn.sh/post-deployment-tasks: slack-notification,performance-test
```

Where verify-infrastructure-problems and slack-notification and performance-test are the name of the new CRDs introduced by KLT, the KeptnTaskDefinition, in the case of pre or post-deployment tasks for your application, you'll need to define them in the definition of your Keptn Application.

If the pre-deployment check is unsuccessful, the workload will be stuck in a pending state.

Another great feature is creating pre and post-deployment evaluations on your workload and the application.

For example, let’s say you have ten services within your application, and they require two CPU cores from your cluster. You could imagine creating a pre-deployment evaluation that retrieves metrics from a metric provider like Prometheus or Dynatrace. In the case of Prometheus, you would need to build the right PromQL to retrieve the current cores available in your cluster and add the right objective.

For example

```yaml
    - name: available cores
      query: "sum(node:node_num_cpu:sum ) - sum(kube_pod_container_resource_requests{resource='cpu'})"
      evaluationTarget: ">2"
```

Keptn will check the required number of cores before deployment. If the conditions aren’t met, your workload will be stuck in a pending state.

You can also use this notion of evaluation in our workload by adding the correct annotation:

```yaml
keptn.sh/pre-deployment-evaluations: my-evaluation-definition
keptn.sh/post-deployment-evaluations: my-eval-definition
```

Keptn includes:

- An operator composed of a scheduler and a control manager (a scheduler in charge of scheduling your workload in your cluster and add the various checks, and the control manager that interacts with the admission controller to ensure the usage of Keptn scheduler is involved in the deployment process of your workload).

- A configmap of each component.

- A service exposing Prometheus metrics out of your deployment.

- And several CRDS.

When a deployment is triggered, the operator receives a request from the admission controller. At that moment, the operator creates or updates the Keptn workload object and the deployment pod to ensure the Keptn scheduler will manage the deployment sequence.

The operator will then create a keptnworkload instance related to this deployment. It also makes the Keptn task based on the information related to our pre and post-deployment checks. All tasks run through a Kubernetes job.

After running the checks, Keptn will schedule the evaluation tasks you have defined. Those evaluations retrieve the metrics from the keptnevaluationprovider that you have configured. So, in the end, we deploy our workload that is attached to a Keptn app.

If the app has a pre-deployment check or evaluation, it would be triggered before any other deployment. If the pre-checks and evaluations are successful, the workload is scheduled. Entering the creating state requires having a node available for your workload and successful pre-deployment checks. Then the workload moves to the creating state and running state.

Once the workload is in a running state, Keptn triggers our post-deployment checks and evaluations. If your checks fail, then your workload ends.

If the workload of the application runs, then Keptn triggers the post-deployment checks and evaluation defined at the application level.

## Keptn CRDs

Keptn introduced several CRDS, but we will only configure a few to manage our deployment sequence, specifically:

- KeptnApp

- KeptnTaskDefinition

- KeptnEvaluationDefinition

- KeptnEvaluationProvider

- KeptnMetric

The other CRDs: KeptnWorkload, KeptnWorkloadInstance, KeptnTask, and KeptnVersion, are automatically created by the operator.

But you should know that:

- The Keptn workload is created from the annotations added in the deployments. It also maps the current active workload instance.

- The Keptn workload instance keeps track of the status of the various checks defined in the workload. Therefore, you'll have to check on the WorkloadInstance to understand the status of your various checks.

- The KeptnTask is created when your validation tasks are running. The Keptn task will create a Kubernetes job to run our check. The Keptn task will keep track of the status of the current job.

- The KeptnEvaluation is created to collect the metrics from our metric provider. Therefore you'll also need to look at the keptnEvaluation to understand the status of your various evaluations.

So let's start with the main object, the keptnApp

### KeptnApp

The KeptnApp maps the various workloads that make up our application. The CRD takes the name of the application (application name). For example

```yaml
apiVersion: lifecycle.keptn.sh/v1alpha2
kind: KeptnApp
metadata:
  name: otel-demo-applicaton
  namespace: otel-demo
spec:
  version: "1.2.1"
  workloads:
    - name: accountingservice
      version: 1.2.1
    - name: adservice
      version: 1.2.1
    - name: cartservice
      version: 1.2.1
    - name: checkoutservice
      version: 1.2.1
    - name: currencyservice
      version: 1.2.1
    - name: shippingservice
      version: 1.2.1
    - name: emailservice
      version: 1.2.1
    - name: redis
      version: 1.2.1
    - name: recommendationservice
      version: 1.2.1
```

You add the application name in your annotations, for example, “otel-demo.”

```yaml
app.kubernetes.io/part-of: otel-demo-applicaton
app.kubernetes.io/name: checkoutservice
app.kubernetes.io/version: "1.2.1"
```

In the CRD, you add the pre-deployment task, evaluation, and post-deployment task with the following:

```yaml
preDeploymentEvaluations:
  - app-pre-deploy-eval-1
preDeploymentTasks:
  - app-check-network
postDeploymentEvaluations:
  - response-time-check
postDeploymentTask:
  - load-test
```

In this example, App-check-network will be the first task in your deployment process, and then it will run the evaluation: app-pre-deployment-eval

And once all the workload is deployed, it will run the task “load-test” and end with the evaluation: response-time-check.

App-check-network and load-test are the names of KeptntaskDefinition. Response-time-check and app-pre-deploy-eval are the names of KeptnEvaluationDefintion.

KeptnAPP also has an optional property: revision. If you don’t define it, the default value is 1.

The advantage of the revision field is to unblock a pending deployment due to a failing task related to an issue in our task definition. Then, you can increment the version number and reapply it. It will then restart the current task in error.

### Keptn Task Definition

KeptnTaskDefinition is a CRD used to define tasks that the Keptn Lifecycle Toolkit can run as part of a pre and post-deployment check of a deployment.

Currently, tasks support the [Deno](https://deno.land/) script. So you can code your check in the task definition like this:

```yaml
apiVersion: lifecycle.keptn.sh/v1alpha2
kind: KeptnTaskDefinition
metadata:
  name: deployment-hello
spec:
  function:
    inline:
      code: |
        console.log("Deployment Task has been executed");
```

Or refer to a script stored in an HTTP endpoint:

```yaml
apiVersion: lifecycle.keptn.sh/v1alpha2
kind: KeptnTaskDefinition
metadata:
  name: kafka-check
spec:
  function:
    httpRef:
      url: https://raw.githubusercontent....
    parameters:
      map:
        host: example-kafka
```

In the future, we should be able to have other runtimes, especially running a container image directly.

A task definition can be configured by referencing the code object, an HTTP script, or another KeptnTaskDefinition.

### Keptn Evaluation Definition

A KeptnEvaluationDefinition is a CRD used to define evaluation tasks that the Keptn Lifecycle Toolkit can run as part of a workload or application's pre and post-evaluation phases.

A Keptn evaluation definition looks like the following:

```yaml
apiVersion: lifecycle.keptn.sh/v1alpha2
kind: KeptnEvaluationDefinition
metadata:
  name: pre-deploy-eval-ressources
spec:
  source: prometheus-provider
  objectives:
    - name: available cores
      query: "sum(node:node_num_cpu:sum ) - sum(kube_pod_container_resource_requests{resource='cpu'})"
      evaluationTarget: ">=2"
```

We will need to define a source that will link to an existing keptnEvaluationProvider, and then the various objectives. This example query is the PromQL that Keptn will send to the KeptnEvaluationProvider named Prometheus-provider.

To keep track of the results of your evaluation, you should interact with KepntEvaluation, by using

```bash
kubectl get KeptnEvaluation -n yournamespace
```

### Keptn Evaluation Provider

A KeptnEvaluationProvider is a CRD used by your evaluation provider, which will provide data for the pre and post-evaluation phases of a workload or application.

A Keptn evaluation provider looks like the following:

```yaml
apiVersion: lifecycle.keptn.sh/v1alpha2
kind: KeptnEvaluationProvider
metadata:
  name: prometheus-provider
  namespace: otel-demo
spec:
  targetServer: "http://prometheus-kube-prometh..."
```

You can also add a secret name if it is required to log in to your Prometheus instance.

### Keptn Metric

A KeptnMetric is a CRD used to define a metric in Keptn. You specify the query, and Keptn retrieves this metric in a regular base

KeptnMetric is designed to help you reuse data across multiple keptnEvaluationDefinition.

So we first define our metric

```text
apiVersion: metrics.keptn.sh/v1alpha1
kind: KeptnMetric
metadata:
  name: keptnmetric-sample
  namespace: otel-demo
spec:
  provider:
    name: " prometheus-provider"
  query: ""sum(node:node_num_cpu:sum ) - sum(kube_pod_container_resource_requests{resource='cpu'})"
  fetchIntervalSeconds: 5
```

Then if you want to use this Keptn metric in your Keptn evaluation definition, you'll need to specify keptn-metric as the source. The name of the metric will be the reference of our Keptn metric

```yaml
apiVersion: lifecycle.keptn.sh/v1alpha2
kind: KeptnEvaluationDefinition
metadata:
  name: pre-deploy-eval-resources
spec:
  source: keptn-metric
  objectives:
    - name: keptnmetric-sample
      evaluationTarget: ">=2"
```

## Creating custom Keptn tasks

Creating a check or task requires building a Deno script. You can code your script directly in your KeptnTaskDefintion, but you'll soon realize that you often have the same type of checks for many deployments. Therefore it makes more sense to build a Deno script that will be stored in GitHub or a custom HTTP endpoint.

When the keptnTask is triggered, Keptn creates the keptnTask and a Kubernetes job to execute your script.

To make it reusable, your script will probably have input parameters, which can be plain text or sensitive.

Plain text parameters will be stored in a JSON object called DATA. Therefore you'll need first to collect your DATA object and then access the various properties for your script.

For example:

```
let text = Deno.env.get("DATA");
let data;
data = JSON.parse(text);
try {
const a = await Deno.resolveDns(data.host, "A");
}
catch (error){
console.error("Could not resolve hostname")
Deno.exit(1)
}
```

The script needs a host to run a DNS resolution in this example. So we need to get the “data.host” property to run this task

To use this script in your keptnTaskdefintion, you'll configure it as follows:

```yaml
apiVersion: lifecycle.keptn.sh/v1alpha2
kind: KeptnTaskDefinition
metadata:
  name: payment-check
spec:
  function:
    httpRef:
      url: https://raw.githubusercontent....
    parameters:
      map:
        host: example-paymentservice
```

The Keptn Lifecycle Toolkit passes the values defined inside the map field as a JSON object (DATA). For the moment, Keptn doesn’t support multi-level maps.

If you need to use sensitive parameters, like tokens or passwords, you can use Kubernetes secrets. To do this, you must pass the function using the secureParameters field.

For example

```yaml
apiVersion: lifecycle.keptn.sh/v1alpha2
kind: KeptnTaskDefinition
metadata:
name: slack-notification-dev
spec:
function:
functionRef:
name: slack-notification
parameters:
map:
textMessage: "This is my configuration"
secureParameters:
secret: slack-token
```

In this example, the Slack token is stored in a secret called "slack-token."

In your script, you'll need to retrieve an object named SECURE\_DATA (a JSON object with all the properties defined in our secret).

For example

```
let text = Deno.env.get("SECURE_DATA");
if (text != undefined) {
data = JSON.parse(text);
}
console.log(body)
let resp = await fetch("https://hooks.slack.com/servic..." + data.slack_hook, {
method: "POST",
body,
});
console.log(resp)
```

Keptn also adds a context variable to your scripts that contains information related to the application and the workload: context. It provides all details about where your task has been triggered.

## Extracting observability data with Keptn

The Keptn Lifecycle Toolkit was built to manage the deployments of your application but also provide the right visibility on your deployments process by supplying observability data.

All the metrics produced by Keptn will be exposed on the Keptn controller manager on the default metric port 2222.

Here are the types of metrics produced by Keptn:

- Application-related metrics

- Workload-related metrics

- Task-related metrics

- Evaluation-related metrics

Keptn provides Grafana dashboards by default, giving you an overview of Keptn, of the Keptn application, and the Keptn workload.

![Grafana dashboards overview of Keptn](~/assets/images/unnamed.png)

A dashboard can be deployed to Grafana using the sidecar feature provided by the Prometheus operator. You need to create a config with your dashboard in a JSON file with the label “grafana\_dashboard:1”.

The application dashboard shows you the traces generated. Still, it will require a Jaeger data source, so you'll need to add Jaeger to your cluster and adjust your OpenTelemetry collector pipeline. Keptn natively generates traces of your deployment on top of the Prometheus metrics.

The scheduler and the control manager require you to define the right *OTEL\_COLLECTOR\_URL*

In the next coming release, the Keptn Lifecycle Toolkit will have a keptnConfig CRD allowing you to define your OpenTelemetry collector URL to send the produced spans.

![Keptn Lifecycle Toolkit OpenTelemetry collector URL](~/assets/images/unnamed-1.png)

In the end, you can easily build your [DORA metrics with the traces and metrics](https://www.devops-research.com/research.html#capabilities).

## Tutorial

This tutorial will use the Keptn Lifecycle Toolkit with the OpenTelemetry Demo application.

We will create a first release of the application with a couple of pre and post-deployment checks.

Then we will create a second release of the application, adding a post-deployment check on the application by adding some sort of load test and pre-evaluation and post-evaluation.

It would be the perfect moment to learn to use KeptnTaskDefintion and KEptnEvaluationDefintion.

We will also look at the metrics and traces produced by Keptn.

For this tutorial, we will require the following:

- A Kubernetes cluster

- The [Nginx ingress controller](/observability/prometheus/how-to-observe-your-nginx-controller-with-prometheus) to expose Grafana

- The [Prometheus](https://www.dynatrace.com/technologies/prometheus-monitoring/) operator

- The cert-manager

- The OpenTelemetry operator

- The Keptn Lifecycle Toolkit demo

- The OpenTelemetry demo customized for the Keptn Lifecycle Demo by adding an annotation to the deployment files.

Watch the full tutorial on my YouTube channel: [What is the Keptn Lifecycle Toolkit?](https://www.youtube.com/watch?v=Uvg4uG8AbFg)

Or follow the steps in GitHub: [What is the Keptn Lifecycle Toolkit?](https://github.com/isItObservable/keptn-lifecycle-Toolkit)
