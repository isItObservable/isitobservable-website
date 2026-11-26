---
craftId: 244889
title: What is Kuberhealthy and how do you use it?
headline: What is Kuberhealthy and how do you use it?
subline: Kuberhealthy is a CNCF project that lets you run precise health checks on your Kubernetes workload.
date: 2023-01-27T02:00:00Z
author: giulia-di-pietro
topics:
  - kubernetes
  - prometheus
  - observability
  - service-mesh
image:
  src: ~/assets/images/kuberhealthy.png
  title: What is Kuberhealthy?
  alt: null
youtube: https://www.youtube.com/watch?v=PKQQEeeMYxg
related:
  - observability/kubernetes/how-to-optimize-your-k8s-applications
  - observability/kubernetes/collect-metrics-in-kubernetes-cluster
  - observability/kubernetes/how-to-collect-logs-in-kubernetes-with-loki-and-promtail
  - observability/kubernetes/how-to-collect-kubernetes-events
  - observability/kubernetes/how-to-autoscale-in-kubernetes-and-how-to-observe-scaling-decisions
  - observability/service-mesh/what-is-servicemesh-and-specially-what-is-istio
goDeeper:
  - text: View the tutorial on KuberHealthy on GitHub
    url: https://github.com/isItObservable/kuberhealthy
---

In today’s blog post and YouTube video, I'll introduce you to [Kuberhealthy](https://github.com/kuberhealthy/kuberhealthy), a [CNCF](https://www.cncf.io/) project that lets you run precise health checks on your Kubernetes workload.

To give some context, I’ll first explain synthetic monitoring, which is important to understand before you start with Kuberhealthy. Then I’ll go into the tool, what CRDs it adds to your cluster, predefined and custom checks, and finally, the ability to report Prometheus metrics from your synthetic checks. As usual, I’ll wrap it up with a tutorial.

## What is synthetic monitoring?

[Synthetic monitoring](https://www.dynatrace.com/news/blog/what-is-synthetic-monitoring/) is an application performance monitoring practice that emulates the paths users might take when engaging with an application.

To guarantee that our environment is running smoothly, you enable certain things in your monitoring:

- A set of alerts usually based on a fixed threshold.\
  The alert threshold should give you enough time to recover or implement auto-remediation.

- Processes that continuously check that our system is running.\
  For example, to check whether you can write in a given folder, you could create a process that tries to create a file in this folder every 10 minutes. If it encounters an issue, you'll be alerted that the check is failing.

This continuous check is designed to report various validations, like technical and functional validation. Technical validation checks, for example, whether your network is up, you can write or read in a given file, etc. Functional validation is usually called synthetic monitoring. You trigger a process that interacts with your application and checks that the response is as expected.

There are several types of synthetic validations, like pings, HTTP requests, and user journey testing.

- Pings only control if the system is listening for incoming traffic.

- HTTP requests send traffic to a given endpoint. It’s similar to the ping check, but you can validate that the response has the right output.

- User journey testing tests a real functional use case. This check is more precise because you’re interacting with the app and seeing if the different components are responding as expected.

All synthetic tests must be executed on several locations to understand if our problem is global or only related to a specific region. You’d often combine local synthetic tests and add the same test from locations where your system is accessible.

Synthetic tests are very important and must be combined with real user monitoring. Real user monitoring collects user behavior and lets you understand the experience delivered to your users, what areas of your application are used by your end users, the impact of an outage for your business, etc. Synthetic testing is still needed on top of real user monitoring because it doesn’t require real traffic to detect an availability issue.

If your environment breaks in the middle of the night, synthetic monitoring is the only way to detect the issue before your users encounter it.

Most observability vendors of the market have synthetic and real user monitoring included in their offerings.

In the Kubernetes world, you can trigger continuous validation, but you need help deploying and managing. In Kubernetes workloads, you can add readiness and health probes.

The readiness probe is designed to run a test to ensure that your application is ready to take traffic. The readiness probe will be used to update the running condition of your pod.

The Health probe is designed to let Kubernetes run a regular check to control that your system is healthy. This would identify which pod will be used to serve the traffic of our Kubernetes service.

Those probes can be designed differently:

- A HTTP request using the HTTP probe, you'll need to expose a specific endpoint that will be used to send this HTTP get request. The probe will only look at the HTTP response code

- A command that will run a command inside the container to check that our app is running, for example

- TCP, where Kubernetes will establish a TCP connection to a specific port. If the connection is established, our pod will be considered healthy.

Those checks are usually designed for the orchestration mechanism of Kubernetes, but you’re not able to export those checks and use them for alerts. That’s why solutions like Kuberhealthy are designed to trigger synthetic tests.

## What is Kuberhealthy?

Kuberhealthy is a Kubernetes operator allowing you to run synthetic monitoring and continuous verification on your Kubernetes workload.

The value of Kuberhealthy is to help you build custom checks against your [Kubernetes](https://www.dynatrace.com/news/blog/what-is-kubernetes-2/) workload. It also comes with predefined checks to check its core health.

Kuberheathy relies on [Prometheus](https://prometheus.io/) to expose extra metrics from your checks and can be deployed either with a manifest file or a helm chart.

When deploying Kuberhealthy, you'll get:

- The Kuberhealthy operator

- A Kuberhealthy service designed to receive the status of your checks and to expose the generated Prometheus metrics

- A preset of checks that will control the daemonset check, the deployment check, and the DNS status check

- A configmap holding the configuration of Kuberhealthy

- Several CRDs (KuberhealthyCheck, KuberhealthyJobs, and KuberhealthyStates)

Kuberhealthy comes with lots of predefined checks, but you have the option to create your custom checks.

When deploying a “Check “ in Kubernetes, it will follow the following process:

1. You define your check (either a single check, KuberhealthyJob, or one that we will run every x seconds, KuberhealthyCheck)

2. You deploy the check

3. The operator deploys a pod that will hold your check

4. The pod check executes the operations defined in your validation

5. Once the check has ended, it will report the status by creating a KuberhealtyState

6. Once the state is created, it will generate Prometheus metrics accessible from Kuberhealthy.

Let’s look at the Kuberhealty CRDs.

## Kuberhealty CRDS

As explained, Kuberhealthy allows you to create checks with the help of the CRDS:

- Khcheck or KuberhealthyCheck

- Khjob or KuberhealthyJob

### Kuberhealty Check

Khcheck is designed to create checks that will run continuously every x seconds.

To define a khcheck, you'll need to define the metadata name and namespace holding this check and the specification of your check:

- Runinterval

- Timeout

- Extra annotation to include a specific annotation in the creation by the Kuberhealthy operator

- Extra labels to add labels that will be added to the pod created

- Podspec that will hold all the configurations of our pod

- Containers with the environment variable, the image, the imagepullpolicy, the name, the request and limits, the volumes, etc.

The logic of your check needs to be held in the container defined in the khcheck

```yaml
apiVersion: comcast.github.io/v1
kind: KuberhealthyCheck
metadata:
name: kh-test-check # the name of this check and the checker pod
namespace: Kuberhealthy # the namespace the checker pod will run in
spec:
runInterval: 30s # The interval that Kuberhealthy will run your check on
timeout: 2m # After this much time, Kuberhealthy will kill your check and consider it "failed"
extraAnnotations: # Optional extra annotations your pod can have
comcast.com/testAnnotation: test.annotation
extraLabels: # Optional extra labels your pod can be configured with
testLabel: testLabel
podSpec: # The exact pod spec that will run. All normal pod spec is valid here.
containers:
- env: # Environment variables are optional but a recommended way to configure check behavior
- name: REPORT_FAILURE
value: "false"
- name: REPORT_DELAY
value: 6s
image: quay.io/comcast/test-check:latest # The image of the check you want to run.
imagePullPolicy: Always # During check development, it helps to set this to 'Always' to prevent on-node image caching.
name: main
resources:
requests:
cpu: 10m
memory: 50Mi
```

### Kuberhealty Job

A khjob is a khcheck that is only executed once. Their CRDs have similar settings to khcheck, but the run interval is missing.

To rerun a khjob, you must delete your khjob and reapply it.

```yaml
apiVersion: comcast.github.io/v1
kind: KuberhealthyJob
metadata:
name: kh-test-job # the name of this job and the job pod
namespace: Kuberhealthy # the namespace the job pod will run in
spec:
timeout: 2m # After this much time, Kuberhealthy will kill your job and consider it "failed"
extraAnnotations: # Optional extra annotations your pod can have
comcast.com/testAnnotation: test.annotation
extraLabels: # Optional extra labels your pod can be configured with
testLabel: testLabel
podSpec: # The exact pod spec that will run. All normal pod spec is valid here.
containers:
- env: # Environment variables are optional but a recommended way to configure job behavior
- name: REPORT_FAILURE
value: "false"
- name: REPORT_DELAY
value: 6s
image: quay.io/comcast/test-check:latest # The image of the job you want to run.
imagePullPolicy: Always # During job development, it helps to set this to 'Always' to prevent on-node image caching.
name: main
resources:
requests:
cpu: 10m
memory: 50Mi
```

Kuberhealthy generates events that inform you whether a given check is running into an error. Otherwise, to debug your check, you simply need to look at the logs of the pod check created by Kuberhealthy once your job or check has been triggered.

### KuberhealthyState

Kuberhealthy provides a specific object that holds the state of your job or check: Kuberhealthystate or khstate.

This shows the following:

- Errors related to the check

- The last execution time

- The node where the last check has been executed

- Status with ok: true or false

- Run duration

Similar information would also be available, showing the status of all your checks on port 80 of the Kuberhealthy service on the Prometheus endpoint.

## Predefined Checks in Kuberhealthy

Kuberhealthy provides a list of [predefined checks](https://github.com/kuberhealthy/kuberhealthy/blob/master/docs/CHECKS_REGISTRY.md). Here are some of them:

- **DaemonSet check** checks if you’re able to deploy and schedule daemonset in your cluster and waits to get all the pods in a ready state. You can also define an environment variable NODE\_SELECTOR only to deploy the check-in-specific nodes.

- **Deployment check** checks if you’re able to deploy a Kubernetes deployment. You can also define the number of replicas you would like to deploy in the environment variable. This check will send HTTP a GET request to the deployed pod. If it returns HTTP 200, then it’s a success.

- **Pod Restart check** checks whether there are no excessive restarts in a given namespace. You need to define the MAX\_FAILURE\_ALLOWED to tolerate some restarts, and you can also check it in the entire cluster, but it requires having the right RBAC deployed.

- **Pod Status check** checks if the latest pod is not in an unhealthy state. If a pod is stuck in a pending state, it will be reported to be unhealthy. By default, this check runs in a given namespace, but you can also run it in the entire cluster (with the right RBAC).

- **DNS Status check** looks for DNS errors, including resolving internal network communication in or outside the cluster. The environmental variables that we could use are HOSTNAME, DNS\_POD\_SELECTOR, or NAMESPACE.

- **HTTP Request check** sends a GET/PUT/DELETE/POST PATCH request to a URL. it checks that we receive an HTTP code equal to the EXPECTED\_STATUS\_CODE ( by default 200).

- **HTTP Content check** is similar to the previous check, but it also checks that the generated response contains a specific string.

There are more predefined checks, but these are just some of the most used ones.

## How do you create a custom check with Kuberhealthy?

To create your own checks, Kuberhealthy provides a client library in Go, JavaScript, and Python.

The client library is designed to report the status of your checks with methods like Checkclinet.reportFailure, and checkclinet.reportSuccess.

Technically, you don’t need to use the client library to report your failures because, in the end, the client sends an HTTP post request to Kuberhealthy. So if you're using a language that doesn't have a library available, you'll simply need to send a post request to Kuberhealthy to report your success or failures.

Here is the payload you need to send:

```
{
Ok: true|false
Errors: []
}
```

“Ok” reports success or failure. “Errors” lists the errors detected by your check (“errors” needs to be empty if the status is true).

In the khjob and khcheck description, you can define a timeout, and you also need to check that your task ends before the timeout. Kuberhealthy will automatically add environment variables to our pod holding all the required information:

- KH\_CHECK\_RUN\_DEADLINE with unixtime of the deadline of our task.

- KH\_REPORTING\_URL with the address of Kuberhealthy

- KH\_POD\_NAMESAPCE with the namespace of our check

- KH\_RUN\_UUID with the UUID of the check.

Suppose you're using a language without a Kuberhealthy library. In that case, you'll need to retrieve the value of KH\_REPORTING\_URL to send your success and failures to the Kuberhealthy server and, of course, the KH\_CHECK\_RUN\_DEADLINE to manage the timeout situation.

## Using Prometheus metrics with Kuberhealthy

The beauty of Kuberhealthy is that the status of the created checks and jobs will be automatically reported as Prometheus metrics. It reports on the Kuberhealthy service on port 80 of Kuberhealthy.

The generated Metrics would be:

- Kuberhealthy\_check\_duration\_seconds gauges metrics for all your checks

- Kuberhealthy\_check reports the status of the checks

Each Prometheus metric has labels such as:

- The check name

- The namespace where your check is running

- The status (1 is fine, 0 means error)

- The error.

You can easily utilize the checks you have deployed to create alerts in the observability solution of your choice.

## Kuberhealthy tutorial

This tutorial will use Kuberhealthy to run the re-deployed checks: Daemonset and deployment.

We will build our custom checks using two solutions:

- [Locust](https://locust.io/). An open source load testing solution in which scripts are built with Python.

- [TraceTest](https://youtu.be/xj7tS2owRvk). An open source tool running HTTP checks but controlling that our request has the right spans generated. For his example, I have built a generic Go script to run the trace test file and look for errors.

For this tutorial, we will need the following:

- A Kubernetes cluster

- The Prometheus operator

- The OpenTelemetry operator that will require the cert manager

- The Prometheus operator

- The NGINX ingress controller to expose tracetest out of our cluster

- Kuberhealthy

- TraceTest

- The OpenTelemetry demo application

Watch the full video tutorial here: [What is KuberHealthy?](https://www.youtube.com/watch?v=PKQQEeeMYxg)\
Or follow the steps directly from GitHub: [isItObservable/kuberhealthy (github.com)](https://github.com/isItObservable/kuberhealthy)
