---
title: "How to Build and Observe Security Policies with OPA Gatekeeper"
slug: how-to-build-and-observe-security-policies-with-opa-gatekeeper
category: security
tags: [security, observability, kubernetes]
youtubeId: w3rQeBvbTlA
publishDate: 2024-06-17
thumbnail: ../../assets/images/opa-1.png
description: "Implementing security policies within your Kubernetes cluster can prevent many headaches. Let’s find out how."
---

Implementing security policies within your Kubernetes cluster can prevent many headaches. Let’s find out how.

This article is part of the Kubernetes series, where we’ve covered various topics. I recently released a new episode related to security that you can watch on YouTube: [How to secure your Kubernetes cluster: Best practices from build to runtime](https://youtu.be/itQnRQlYFBA).

That episode covered the tasks required to secure your cluster from build to runtime. Today, you’ll focus on security policies and how to avoid human mistakes with a CNCF project called [OPA Gatekeeper](https://open-policy-agent.github.io/gatekeeper/website/).

Here’s a quick overview of the topics you’ll cover:

- Why you should create security policies in your cluster

- The Open Policy Agent

- The OPA Gatekeeper

- The Gatekeeper library, with its prebuilt constraints

- The observability signals that Gatekeeper provides and how to take advantage of them

## Why should you create security policies in your cluster?

Creating security policies in your cluster is essential to avoid mistakes by our project teams. In the previous episode, we explained the importance of preventing high privileges from being given to our workload. The security is defined in our deployment by configuring the security context that provides:

### Workload Security

With the security context, we define which user, group, or fsGroup will be used by our pods or containers. This ensures that only authorized entities can access and execute workloads, thus maintaining a secure environment.

### Advanced Security Configurations

The security context also allows configuring advanced security settings, such as adding or dropping kernel capabilities. Dropping capabilities is important to avoid giving access to sensitive features of our kernel and letting the hacker reach the node of our cluster. We can also block mounting the root file system in read-only mode and enforce other security controls. These configurations help limit the potential attack surface and enforce best practices.

### Prevention of Unauthorized Access

Letting our project configure those crucial security settings for our project teams without being able to validate their decisions could introduce vulnerability.

That is why PodSecurity Policies (PSP) were previously used to create global policies per namespace or service account, blocking or notifying administrators when workloads requested higher privileges than authorized. Although the Pod Security Standard has replaced PSP in Kubernetes v1.25, the goal is to prevent unauthorized access and ensure that workloads operate within defined security parameters.

### Cluster Management Simplification

Security policies also aid in cluster management by ensuring that teams follow specific operational rules, such as:

- Applying correct labels or annotations to resources

- Ensuring that requests and limits are defined reasonably

- Managing the number of replicas to avoid excessive resource consumption

- Ensuring readiness and health probes are defined for deployments

- Avoiding the creation of service with the type nodeport

### Policy Enforcement Tools

Tools like Kyverno and OPA Gatekeeper, based on the Open Policy Agent project, help enforce these policies within Kubernetes clusters. They provide mechanisms to automate policy enforcement, making managing and securing the cluster easier.

By implementing security policies, you can maintain a secure, compliant, well-managed Kubernetes environment and ensure that workloads run safely and efficiently.

## Introduction to the Open Policy Agent

Before you discuss the concept of OPA Gatekeeper, you need to briefly explain its central component: [OPA, the Open Policy Agent](https://www.openpolicyagent.org/).

OPA is a project that provides a specific language to help you create policies. Its approach is not to ship your policies within your code but to decouple them. OPA will act as a component, helping you make decisions based on your policies.

![OPA Gatekeeper](~/assets/images/policydecouplingOPA.svg "width=495")

The concept is simple: your component will send an API request with JSON content to OPA, and OPA will run your policies against this payload and return a decision.

The policies in OPA are written in a specific language called Rego, which is very easy to understand.

So, OPA won’t reject or block but will help other tools make decisions based on your rules.

This means OPA is not designed for any specific domains. You could imagine using it to control your resources, scaling policies, the type of OS used, the repo used by your images, etc., and more.

This means that OPA won't be used in a standalone mode; it will be used in combination with other tools.

### How do you use OPA?

First, you need to deploy it and install it as a CLI. Once installed, you can evaluate a payload against a policy.

But you usually use OPA more in server mode. This means that you launch OPA in a host or a container by loading a policy, and then to evaluate the decision, you simply send an API request to OPA, passing the content (in JSON) in the request's payload.

OPA ends usually have a sidecar container or a central gateway to provide an easy-to-use framework for policy decisions. For example, OPA created a [tutorial with Istio](https://www.openpolicyagent.org/docs/latest/envoy-tutorial-istio/) where OPA was injected as a sidecar beside the envoy. In this particular use case, OPA would be used to delegate the authorization policies of istio

If I want to filter a specific API for a particular type of user, In this use case, Envoy will receive the request. Before sending it to your application code, it will send an API request to OPA to get feedback on whether to filter the request or forward the traffic to our application container.

OPA will get the envoy's payload with the request details, the header, and more. So, you could create an OPA policy that utilizes this information to control, for example, the user connected being authorized to reach this endpoint.

We will define your rules and decisions in the policy Rego file. This means you’ll determine how OPA will respond to the incoming data in the Rego file.

In Rego, you can define one single rule.

```text
Rule{
  Statement1
  Statement2
  statemnet3
}
```

The rule named Rule will be true if all the statements are true.

If you want to create an OR, then you would need to create two instances of your rule:

```
Rule{
statement1
}
Rule{
statemetn2
}
```

Here, the decision will be based on statement1 or statement2

Similar to JavaScript, Rego would parse your JSON or YAML.

For example, pod.spec.containers\[0\].image is pointing to the image name of the first container of your pod.

Rego has plenty of operations for string, arithmetic, and more. It also has predefined operations that help us loop in our data, such as every, in, and some.

For example:

We want to create a rule that checks the port name and number.

```text
Htttps_protocol if{
  Some container in pod.spec.containers
  coontainer.port[_].containerPort == 443
}
Htttps_protocol if{
  Some container in pod.spec.containers
  coontainer.port[_].name == "https"
}
```

We won’t go too deep into Rego because explaining this language's potential would take forever. However, a critical thing with OPA is that you have a testing feature available in the CLI, which means you could technically create unit tests on your policies and include them in your CI/CD. However, the most important thing is that OPA provides a playground website that helps you build and test your policy. Here is the link to the playground: [The Rego Playground (openpolicyagent.org)](https://play.openpolicyagent.org/)

One fantastic feature provided by OPA agents is observability. OPA will, by default, provide Prometheus metrics. The metrics produced mainly focus on reporting the runtime metrics to understand the health of the OPA agent. The OPA agents also provide OpenTelemetry distributed traces, but you need to enable it by configuring the OPA agents by adding this section in the OPA configuration file:

```yaml
distributed_tracing:
  type: grpc
  address: url of your otel collector on the port 4317
  service_name: name of the OPA agent
```

## Introduction to the OPA Gatekeeper

OPA Gatekeeper is a Kubernetes operator helping you create specific security policies for your K8s cluster, covering not only security context settings but any details that could be available within your services, deployments, and Kubernetes objects

As expected, the OPA Gatekeeper will rely on OPA and Rego to create your policies.

The critical value of OPA Gatekeeper is its [library](https://open-policy-agent.github.io/gatekeeper-library/website/) with predefined constraints. If you’re far from an expert in Rego, don’t worry—you can reuse the existing library created by the OPA community.

As expected from an operator, the OPA Gatekeeper will provide a control plane that allows you to define your rules. You would define those rules using the new CRD supplied by the operator.

OPA Gatekeeper has three key concepts: constraints, constraints template, and mutation.

It makes your lives easier when building a set of rules. You can create templates with constraints with a specific OPA script and parameters configuring your constraint rule. For example, if I want to constrain the maximum number of CPU or memory requested, I can create a parameter for the maximum values. This means I could use and customize this constraint depending on the namespace.

### ConstraintTemplate: The OPA Gatekeeper constraint framework

But let’s first explain the constraint framework available in OPA Gatekeeper. The idea is that you define a ConstraintTemplate with a specific name. The name is important because if you create a future type of constraint name, you’ll use it later when deploying your constraint rules. Imagine we’re building a sort of CRD.

This constraint template will have details like:

- The future name of the constraint created by this template

- The parameter that would be required or optional to help you configure this constraint

- And the targets allow you to define how this constraint will interact with your K8s cluster.

For each target, you’ll define the target type, ” It could be either *admission.k8s.gatekeeper.sh* or *authorization.k8s*.gatekeeper.You usually use the *admission.k8s.gatekeeper.sh* because it targets any object created in our k8S environment, so namespaces, services, Ingres, pod, deployment, etc. *authorization.k8s*.

It is designed for rules evaluating requests sent to your K8s API. Out of the objects targeted by your constraint, you’ll have a Rego section where you’ll add your Rego code to define your rule.

```text
violation[{"msg": msg, "details": {}}] {
  # rule body
}
```

The only difference in the Rego code for OPA Gatekeeper is that the rule must be named ‘violation,’ it will return two properties: ‘msg’ with the message of the violation and ‘details’ providing more information on why the object has been denied. All your Rego codes will be included in a single package.

Once your template is deployed, you can inform OPA Gatekeeper that you want to deploy constraints using an existing template.

For example, I'm creating a constraint template controlling the HTTPS named k8shttpsonly:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8shttpsonly
  annotations:
    metadata.gatekeeper.sh/title: "HTTPS Only"
    metadata.gatekeeper.sh/version: 1.0.2
    description: >-
      Requires Ingress resources to be HTTPS only. Ingress resources must
      include the `kubernetes.io/ingress.allow-http` annotation, set to `false`.
      By default a valid TLS {} configuration is required, this can be made
      optional by setting the `tlsOptional` parameter to `true`.

      https://kubernetes.io/docs/con...#tls
spec:
  crd:
    spec:
      names:
        kind: K8sHttpsOnly
      validation:
        # Schema for the `parameters` field
        openAPIV3Schema:
          type: object
          description: >-
            Requires Ingress resources to be HTTPS only. Ingress resources must
            include the `kubernetes.io/ingress.allow-http` annotation, set to
            `false`. By default a valid TLS {} configuration is required, this
            can be made optional by setting the `tlsOptional` parameter to
            `true`.
          properties:
            tlsOptional:
              type: boolean
              description: "When set to `true` the TLS {} is optional, defaults
                to false."
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8shttpsonly

        violation[{"msg": msg}] {
          input.review.object.kind == "Ingress"
          regex.match("^(extensions|networking.k8s.io)/", input.review.object.apiVersion)
          ingress := input.review.object
          not https_complete(ingress)
          not tls_is_optional
          msg := sprintf("Ingress should be https. tls configuration and allow-http=false annotation are required for %v", [ingress.metadata.name])
        }

        violation[{"msg": msg}] {
          input.review.object.kind == "Ingress"
          regex.match("^(extensions|networking.k8s.io)/", input.review.object.apiVersion)
          ingress := input.review.object
          not annotation_complete(ingress)
          tls_is_optional
          msg := sprintf("Ingress should be https. The allow-http=false annotation is required for %v", [ingress.metadata.name])
        }

        https_complete(ingress) = true {
          ingress.spec["tls"]
          count(ingress.spec.tls) > 0
          ingress.metadata.annotations["kubernetes.io/ingress.allow-http"] == "false"
        }

        annotation_complete(ingress) = true {
          ingress.metadata.annotations["kubernetes.io/ingress.allow-http"] == "false"
        }

        tls_is_optional {
          parameters := object.get(input, "parameters", {})
          object.get(parameters, "tlsOptional", false) == true
        }
```

This template will control that ingress rules have HTTPS configured.

This template has an optional property (parameter) when building this constraint. You’ll need to configure it with the optional parameters defined in this template: tlsOptional, which could be set to true.

If you want to force this constraint on all the clusters, I’ll deploy the following constraint:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sHttpsOnly
metadata:
  name: ingress-https-only
spec:
  match:
    kinds:
      - apiGroups: ["extensions", "networking.k8s.io"]
        kinds: ["Ingress"]
```

It is almost like k8shttpsonly, a new CRD in your cluster.

In the given constraints, precisely defining the content targeted by this rule is possible. This is achieved through the "match" property, which assists in specifying the particular namespace that the constraint targets. Additionally, there are options to manage namespaces more effectively: "Namespaces" allows for passing a list of targeted namespaces. At the same time, "Excludenamespaces" provides a way to prevent specific namespaces from being affected by the rule.

For example:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sHttpsOnly
metadata:
  name: ingress-https-only
spec:
  eforcementAction: deny
  namespaceSelector:
    machLabels:
      policyenforcement : active
  match:
    kinds:
      - apiGroups: ["extensions", "networking.k8s.io"]
        kinds: ["Ingress"]
```

The other CRD provided by Gatekeeper is a mutation, which allows you to modify K8s resources when you deploy your workload. Mutation has many options to change the metadata, the image of the container used, any settings of your manifest, and more.

For example, mutating the deployments to add the required labels and so one mutation is a great feature but could break the behavior of your workload. So, mutation rules on metadata make sense, but it could become a challenge for other things.

I prefer to block a deployment and force your teams to respect your policy rather than modify the workload.

## Overview of the OPA Gatekeeper Library

What is excellent about OPA Gatekeeper is the ability to extend your policy by creating your constraints template and having a predefined set of libraries.

OPA Gatekeeper has a [specific webpage](https://open-policy-agent.github.io/gatekeeper-library/website/) listing existing constraints, templates, and mutations.

There are lots of existing constraints that you could use or even customize to:

- Define constraints on requests or limits

- Control the reasonable number of replicas on your HPA

- Make sure that your workload has the right sets of labels or annotations

- Bock any service deployed in the node port

- And more

Of course, it also provides constraints related to the security defined in your pods. This includes blocking pods that don't respect your default sets of capabilities and workloads that don't have read-only root filesystems. It also involves managing privileges for containers and the range of users or groups defined in your workload, among other security measures.

This means the basic security policies you need to create in your cluster to avoid a high-privilege workload are already there, so you’ll simply utilize the existing libraries.

Again, you can adjust those templates to your need to customize the constraints before deploying them by configuring the parameters of the limitations or by simply limiting them to specific namespaces.

The library also provides a predefined set of mutations if we’re, for example, looking to force the configuration of a few security contexts on your team's workload.

Mutations are great, but you’ll need to measure the impact of forcing a few workloads to use a predefined set of capabilities, for example.

## Observability with OPA Gatekeeper

Similar to OPA, Gatekeeper provides observability. When deploying OPA Gatekeeper, you’ll find a control plane named controller-manager and and extra workload named audit.

This workload will produce many logs on the audits triggered by OPA. All the violations related to the constraints deployed will end in the controller manager logs. You'll be able to identify violations that have been denied or simply throw a warning.

This means the log of those two workloads would be a valuable data source you’ll ingest in your Observability-Backed system.

These logs are remarkable because they provide many details, including the type of validation or mutation, the source, and the k8s metadata of the violated object.

If you want, you can extend the logging by enabling the log stats on the admission controller pod of Gatekeeper by adding this argument: --log-stats-admission

This will produce detailed stats on the duration of the Rego code. It is interesting, but I’ll create many logs, which may be expensive.

I think the existing logs produced by OPA are already of great value.

So, the game would use a collector to read the logs from those pods. Use the transform processor to parse the content and add extra metadata to your logs. It could also be interesting to adjust the k8sattribute process to assign the log entry to the workload having a violation or a warning and then send it to your backend. However, if OPA blocks the deployment of a given pod, the k8sattribute process will never find the pod because it is technically not there.

So, I would leave the details to the OPA Gatekeeper workload by preparing the fields.

I’ll need to use the routing connector and the transform processor to achieve that with a collector.

So, let’s have a look at an example of a pipeline:

```yaml
receivers:
  otlp:
    protocols:
      grpc: { }
      http: { }
  filelog:
    include:
      - /var/log/pods/*/*/*.log
    start_at: beginning
    include_file_path: true
    include_file_name: false
processors:
  batch:
    send_batch_max_size: 1000
    timeout: 30s
    send_batch_size : 800
  k8sattributes:
    auth_type: "serviceAccount"
    passthrough: false
    extract:
      metadata:
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.deployment.name
        - k8s.statefulset.name
        - k8s.daemonset.name
        - k8s.cronjob.name
        - k8s.namespace.name
        - k8s.node.name
        - k8s.cluster.uid
    pod_association:
      - sources:
          - from: resource_attribute
            name: k8s.pod.name
          - from: resource_attribute
            name: k8s.namespace.name
    # Pod labels which can be fetched via K8sattributeprocessor
  memory_limiter:
    check_interval: 1s
    limit_percentage: 70
    spike_limit_percentage: 30
  resource:
    attributes:
      - key: k8s.cluster.name
        value: ${CLUSTERNAME}
        action: insert
  transform/audit:
    error_mode: ignore
    log_statements:
      - context: log
        statements:
          - merge_maps(cache,ParseJSON(attributes["log"]), "upsert") where attributes["log"] != nil
          - set(resource.attributes["opa.message"],cache["msg"]) where cache["msg"] != nil
          - set(resource.attributes["opa.constraint.name"],cache["constraint_kind"]) where cache["constraint_kind"] != nil
          - set(resource.attributes["opa.event.type"],cache["event_type"]) where cache["event_type"] != nil
          - set(resource.attributes["opa.constraint.action"],cache["constraint_action"]) where cache["constraint_action"]!=nil
          - set(resource.attributes["opa.request.user"], cache["request_username"]) where cache["request_username"] != nil
          - set(resource.attributes["opa.process"], cache["process"]) where cache["process"] != nil
          - set(resource.attributes["opa.timestamp"], cache["ts"]) where cache["ts"] != nil
connectors:
  routing/log:
    default_pipelines: [ logs/default ]
    error_mode: ignore
    table:
      - statement: route() where attributes["k8s.namespace.name"] == "gatekeeper"
        pipelines: [ logs/audit ]
  otlphttp:
    endpoint: ${DT_ENDPOINT}/api/v2/otlp
    headers:
      Authorization: "Api-Token ${DT_API_TOKEN}"
service:
  pipelines:
    logs/audit:
      receivers: [ routing/log ]
      processors: [ transform/audit,k8sattributes,transform,resource,batch ]
      exporters: [ otlphttp,logging ]
    logs/default:
      receivers: [ routing/log ]
      processors: [ k8sattributes,transform,resource,batch ]
      exporters: [ otlphttp ]
    logs:
      receivers: [filelog]
      processors: [memory_limiter]
      exporters: [ routing/log]
```

As you can see in this collector pipeline, the routing connector triggers a specific pipeline for the log produced by the OPA Gatekeeper. The condition to trigger the pipeline is based simply on the namespace.

The logs/audit pipeline will simply parse the content provided by OPA Gatekeeper, which adds a JSON payload with lots of exciting information, such as the type of event, the type constraint name, etc. By parsing those files, you could use those extra metadata to create statistics on your violations.

Out of the logs, Gatekeeper will also produce Prometheus metrics. This helps you keep track of the number of constraints, mutations, requests received by the control plane, and the duration of the validation or mutation request. You'll also have the number of violations and the time to run the audit.

Using those metrics, you could quickly build a precise dashboard that tracks the status of your policies and the Gatekeeper's health.

In my case, I have built the following Dynatrace dashboard based on the OPA Gatekeeper metrics:

![Dynatrace dashboard based on the OPA Gatekeeper metrics](~/assets/images/oat05854.dev.apps.dynatracelabs.com_ui_apps_dynatrace.dashboards_dashboard_a9188b3f-9733-4c6c-ba7d-60e097d646d9bloghd-1.png)

## Conclusion

Implementing security policies in your Kubernetes cluster with OPA Gatekeeper ensures a robust, compliant, and well-managed environment. By leveraging the power of OPA and Rego, you can define detailed policies that prevent unauthorized access and enforce best practices. OPA Gatekeeper simplifies policy enforcement and provides extensive observability features, allowing you to monitor and manage your cluster's security effectively.

To delve deeper into how you can secure your Kubernetes cluster by implementing policies with OPA Gatekeeper, watch the video on my YouTube channel: [How to build and observe security policies with OPA Gatekeeper](https://youtu.be/w3rQeBvbTlA)

## Go deeper

- [View the tutorial on OPA Gatekeeper on GitHub](https://dt-url.net/observable-opagatekeeper)
