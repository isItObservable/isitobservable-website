---
craftId: 305074
title: How to secure your Kubernetes cluster
subline: How do you implement security measures in your Kubernetes cluster to protect it against threats from build to deployment?
date: 2024-06-17T09:24:00Z
author: giulia-di-pietro
topics:
  - security
  - kubernetes
image:
  src: ~/assets/images/k8ssecurity.jpeg
  title: "How to Secure Your Kubernetes Cluster: Best Practices from Build to Runtime"
  alt: null
youtube: https://www.youtube.com/watch?v=itQnRQlYFBA
related:
  - observability/kubernetes/how-to-build-and-observe-security-policies-with-opa-gatekeeper
  - observability/kubernetes/critical-vulnerability-found-in-fluent-bit-what-you-need-to-know
  - observability/service-mesh/what-is-servicemesh-and-specially-what-is-istio
  - observability/service-mesh/what-is-linkerd-and-can-you-observe-it
  - observability/service-mesh/what-are-cilium-hubble
  - observability/kubernetes/collect-metrics-in-kubernetes-cluster
---

In this blog post, we'll explore how hackers could target your cluster and introduce ways to fortify every layer of your environment, including:

- Secure application development

- Permission limitation

- Network control

- Resource usage optimization during DDoS attacks

- And the importance of runtime vulnerability scanners.

Let's dive in!

## Security best practices with Kubernetes

We often forget crucial security best practices when utilizing cloud-native technology such as K8s. you usually think that K8s will provide out-of-the-box security. That’s wrong, and it’s crucial to understand that hackers can quickly threaten your environmental data.

Hackers seek internal weaknesses to exploit your data, impact customers, and more.

Think of it as your house. A hacker is like a thief who wants to break into your house or apartment to take your most precious items. They will try to find a way to enter by unlocking your door and breaking your windows.

In the K8s world, the door or window are the assets you expose to the outside world, like an ingress rule or an API. It would then mean you‘ll try to put the right locks or protection on your network assets simply by using SSL or mTLS and the right level of authentication for your K8s API. But you can and should do more to make the attacker work harder to get into your environment.

Then, the actual application could expose vulnerabilities, helping the hacker get into your house. Application vulnerabilities could be resolved by applying security best practices when coding your application, avoiding SQL and cmd line injections. But even if you have done all the best coding practices, if you use a library with a well-known vulnerability, the attacker could also try to exploit it.

Similar to your house, a talented thief can penetrate your house even if you use the best locks, doors, and alarms. So, you must make their journey more complicated to find your valuable assets stored in specific rooms (namespace).

We could try to put badges and locks in your rooms, vaults, and, more so, K8s; it would be the same.

### How would a hacker attack my cluster?

It is essential to understand how a hacker could take control of your cluster to put the proper security in place.

Let’s start with how they would enter the house. **The hacker will try to connect to the public webpage and do SQL or command injection.** They’re trying to get as much information as possible to help them penetrate the front door by getting the IP, the name of the host, the library used by the application, or simply the environment variables detailed on your application’s host.

As explained, they would also use networking tools to expose the port by this public address to see if any weak encryption or missing firewall rules exist. The game is simple: try to find a door and connect to it.

When working in your environment, you usually connect to your servers using SSH tools. Still, the hacker expects you to use private keys or expose the SSH port to a limited number of IP addresses, so he will try to make a reverse connection.

What does it mean? It will launch a tool locally on his laptop to listen for an incoming connection. Then, he will try to find a way to ask your application to initiate the connection to his computer.

Tools like [Pwncat](https://pwncat.org/) will help them achieve that. So, the game is about finding a clever way to open a remote connection to your server. Once the connection is made, we’ll be in your house.

**Once in there, a thief will explore your house by going from one room to another to find valuable assets.** **But your home is a bit like a hotel in a K8s world based on pods and containers.** When connected, the hacker is technically in a pod, a container. So, the hacker is in one room of your hotel. You'll try to see if he can open other doors with the current key of your container.

So, the hacker will look at how much information he can see using the container's service account of the container. As you may know, each application uses a service account in the cluster. The service account is linked to a specific role within your cluster. The user account is a bit like the key to your room. **In many hotels, the key to your room often limits access to various floors. In K8s, the rights defined by your service account would be determined with an RBAC.** The RBAC establishes the level of privileges a service account has when interacting with the K8s API. Usually, it is supposed to be limited to the namespace and to a few actions like get or list.

So, **the hacker will try to use kubectl with the service account token, that could be simply stored with a simple secret**. That is why you need to give limited rights to your application's service account. If the service account has limited rights, the hacker will try to find another pod that interacts with your application. The idea is to find another workload with higher privileges.

If your application runs under a root account out of the service account, you let the attacker install and write files. By giving the attacker root access to your container, you’re helping them in their exploration.

**The hacker can try to install extra tools in the container.** They could use additional tools to sniff the pod's traffic and are attempting to identify workloads that may be more vulnerable.

Once he found the right vulnerable pod, you could then simply use kubectl with the K8s token (if the token is accessible) of this vulnerable workload to deploy a pod having higher privileges on the node.a\[1\] and then simply connect to this fresh new pod deployed in this cluster and run command on the node to get information, root password the game as you understood is to start from one component, and jump to higher components and discover more weakness.

So, what can you learn from this information?

1. The application must be designed securely to avoid cmd, SQL injection, or port mapping.

2. Your application uses a vulnerable library, which the hacker could use to use a similar approach.

3. Your workloads must use restricted RBAC to avoid exploring the entire cluster.

4. You need to limit your pod's privileges to prevent the attacker from installing extra tooling in your environment.

5. You need policies to limit traffic to your pods. If no policies are in place, the attacker could send traffic to any workload of your cluster.

6. You need to have a policy in place to block strange workloads asking for high privileges.

Here are some key considerations for running your application in a cluster:

- Application Security: First, ensure your application, which refers to pods and containers, is secure. Even if your infrastructure and platform are secure, deploying a vulnerable application can weaken the entire system. The primary step is to have a secure application running in your cluster.

- Kubernetes Cluster Security: The Kubernetes cluster itself can introduce vulnerabilities if not properly managed. This includes ensuring secure communication between pods, correctly using service accounts with appropriate roles, implementing proper policies, and encrypting your secrets.

- Infrastructure Security: The platform relies on node servers, which can be vulnerable if you don't use an up-to-date operating system, apply proper networking rules, or set appropriate privileges. Ensuring your infrastructure is secure is crucial.

The market classifies these aspects into three sections: build (for your application), deploy, and runtime. These sections help add restrictions and detect vulnerabilities within your running pods.

## Build secure images

Because your application is a potential door to your cluster, you need to build secure code and container images.

When building your application, you need to consider different levels of security. Your code must be safe to avoid backdoors to your environment, such as SQL or command-line injection. This piece is related to code-secure applications. We often use external libraries to code your logging application, writing assets into disk, external storage, databases, observability, and more. All those external libraries must be safe and not introduce any weakness in your cluster.

Scanners like [SonarQube](https://www.sonarsource.com/products/sonarqube/) can help you detect weaknesses in the build phase of your CI/CD pipeline.

The next step is to build a container image for your application and deploy it in your cluster. When building your container image, you rely on operating system images and packages that could also introduce weaknesses. As you know, you’ll also use a specific user and group within your containers. So, of course, you would avoid using the root user.

We usually start by producing an SBOM file to detect any image weakness. SBOM stands for Software Bill of Materials. This SBOM won't give you any feedback on the vulnerabilities of a given library.

But it is crucial information because it will give you a picture of all the different parts that make your software. It is technically the inventory of your application's library and packages.

What information will you get from the box? The industry has two formats: SPDX and CYCLONEDX.

Both will provide for each library or package:

- The supplier name

- The component name

- The version

- The dependencies

- The creator

- Licensing details

- And the date

But the SBOM file at the end is only the inventory. While it helps identify licensing issues, it does not tell if one of those packages is vulnerable.

You usually combine the SBOM file with another solution that downloads local databases based on known vulnerabilities. You typically rely on OSV, the OpenSource Vulnerabilities database that aggregates vulnerabilities of open source components and other ecosystems (Python, Golang, Rust, etc.), the GitHub advisory database, and the global security database.

In those databases, every library, package, and component with a vulnerability in a given version would have a CVE number (Common Vulnerabilities and Exposures). The tool will review your inventory and list all the components with known vulnerabilities and their criticality.

Some tools will simultaneously produce the SBOM and the list of vulnerabilities, valid for tools like [Trivy](https://trivy.dev/).

Generating this scan when building your application is excellent, but it has some limitations.

The tool scans your libraries and checks whether any are considered vulnerable during the scan.

You can scan a library version, and no vulnerability will be detected. But maybe a few months later, this library is considered vulnerable. So, you can’t limit yourselves only to the results produced during the build process. It is inefficient because the vulnerability database changes over time.

That is why you need to consider continuously scanning your image registry to detect any weaknesses in your existing images. Including a scan at runtime in production would be even more productive.

The issue with scanning at the bit is that it will list many vulnerabilities within your image. Because the scanner looks at the libraries in the image, it can’t understand if this library will be loaded when your application runs.

That is why runtime scanners are usually more efficient and avoid much noise. Runtime scanners capture the exact libraries loaded by the application, helping you focus your effort on vulnerabilities that could impact your application.

However, one of the biggest challenges is relying on many external libraries when building modern software. The current state is that the number of vulnerabilities is continuously growing even if your community is putting in a lot of effort to resolve the existing ones.

So, you need to be aware that you’re running risks with a few libraries and utilize tools to mitigate the risks if an attacker exploits this vulnerability.

## Restrict the permissions

Once you have a safe image, you’ll deploy this new workload in your cluster.

To deploy your application, you need to define the correct manifest file, how it would be deployed, and the networking required to expose it through a K8s service.

When building your manifest file, that will define the security context of the workload and the service account used by the application

The security context is critical to your deployment because misconfiguring could allow your pod to access the host network, have root privileges, and more.

There is a security context option if you pay attention to object deployment, statefulset, and other options.

The spec template can define the security context to assign a global policy for all containers or in the specific context for each container.

The security context will assign a specific user, group, and fsGroup for your volumes. So, even if you have built your container with a particular user, the security context can allow you to use another user or group.

A vital configuration also controls whether a process inside a container can get more privileges: the boolean allpriviledgeescation = false.

As explained, the attacker will try to install extra tooling in your container. To block hackers from adding binaries, you can force-mound the container root file system as read-only, stopping the attacker from writing anything in the pod.

The security context is a vast concept with many various configurations. You can define a security capability that controls what type of kernel rights you authorize or disables them in the container with drop.

For example:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: teststatefulset
  namespace: testns
spec:
  selector:
    matchLabels:
      app: dev
  serviceName: test-pod
  replicas: 2
  template:
    metadata:
      labels:
        app: dev
    spec:
      containers:
        - name: test-statefulset
          image: nginx
          imagePullPolicy: Always
          securityContext:
            runAsUser: 1025
            privileged: false
            allowPrivilegeEscalation: true
            capabilities:
              drop:
                - ALL
              add:
                - SUID
```

The only capability added in this container is SUID, but SUID is technically the privilege to set height rights to the account.

If the attacker reaches a container, it is a process running on the host. He could quickly get the host IP and start sniffing the traffic. That is the reason you want to define the right capability precisely.

If you’re not limiting the capabilities, your container will get the default set of capabilities:

```text
"CAP_CHOWN",
"CAP_DAC_OVERRIDE",
"CAP_FSETID",
"CAP_FOWNER",
"CAP_MKNOD",
"CAP_NET_RAW",
"CAP_SETGID",
"CAP_SETUID",
"CAP_SETFCAP",
"CAP_SETPCAP",
"CAP_NET_BIND_SERVICE",
"CAP_SYS_CHROOT",
"CAP_KILL",
"CAP_AUDIT_WRITE",
```

With the default capabilities, you can already let the attacker take control of your environment, especially with cap syschroot, setuid, setgit, or even the net\_bind service.

Find the complete list of capabilities [here on GitHub](https://github.com/torvalds/linux/blob/master/include/uapi/linux/capability.h).

The only challenge is identifying kernel capabilities that won’t affect your application.

So, you should start by dropping all capabilities and only adding the ones you need to limit the risks. It sounds like a long journey to fine-tune this, but you can utilize tools like [Falco](http://falco.org/) to identify the required capabilities during testing.

The security context is excellent, but it would be defined by the project team, which could sometimes request more privileges than the one officially authorized by your organization. So, can you avoid having a high-privilege workload in your cluster?

A few months ago, Kubernetes had an interesting feature named Pod Security Policy, which allowed you to define the default policies authorized in this cluster.

If your deployment did not respect those policies, the scheduler rejected your deployment.

Since Kubernetes 1.25, this feature has been deprecated and replaced by adding a Pod security admission. Adding the correct annotations enables a pod security standard for given namespaces.

There are three levels of security standards:

- Privileges, so allowing everything to this type of workload

- Baseline, providing minimum restrictive policy (default security policy)

- Restricted, where the pod has limited restrictions, the project could only add the net\_bind capability.

To enable pod security admission, you need to add labels to your namespaces to define the level type and how to react to a violation: Enforce, Auditing, and Warning.

Enforce means that it will be rejected if the workload's security context does not respect the defined level. Auditing means that the workload will be allowed if there is a violation, but it will trigger an audit log. A simple warning will be issued when deploying the workload if there is a violation.

To set the level and how to react is done by defining the following workload to the namespace:

```
pod-security.kubernetes.io/<MODE>: <LEVEL>
```

Mode( meaning enforce, audit, wardnin) and level : privilege , baseline, restricted.

Otherwise, external tools, such as [OPA Gatekeeper](https://open-policy-agent.github.io/gatekeeper/website/) or [Kyverno](https://kyverno.io/), help you build more advanced rules for your security, permissions, resource usage, etc. (Read more about OPA Gatekeeper in my other blog post: How to build and observe security policies with OPA Gatekeeper)

Those tools will introduce new CRDs that define your policies and block any workload that does not respect your policy.

The other important thing is the service account assigned to your workload. When running your application, you’ll assign a service account; if not, it will use the default provided by the namespace.

Creating the service account is one thing, but defining the authorized rights is more important. The role and role binding could be at the namespace or the cluster level with clusterrole and clusterrolebinding.

Rolebinding will link the service account with your role, so you will define what type of asset objects you are authorized to query on the K8s API through your role.

To protect your cluster from external interaction with your K8s API, limit access to the K8s API to a list of IP addresses and enable authentication with a certificate by using openID or the cloud provider credentials to authenticate to the K8s API.

The most sensitive data, login, token, and encryption keys must be securely stored in your cluster. Never pass plain text configuration in an environment variable of your workload or a configmap. That is the reason you have Kubernetes secrets. You'll see that later secrets in K8s are great. But by default, the value is encoded by base 64, so nothing is secure.

But suppose you want to avoid having a hacker see your secrets and determine their value. In that case, avoiding giving access to your sensitive secrets to your application's service account is crucial.

We can enable encryption using the EncryptionConfiguration in the secret CRD to secure your secrets. This configuration will use a specific encryption key to encode your secrets. However, the downside is that you would need to store the key somewhere secure to encode/decode your values.

Otherwise, you can use the [External Secret Operator](https://external-secrets.io/) to connect your cluster to third-party services that store your data securely, like AWS Secret Manager, Google Secrets, etc.

## Restrict the network

The other important thing to consider is networking. As you know, in K8s, a pod can send requests to any cluster workload by default, and the communication is not encrypted, so you can easily sniff/capture the traffic from one workload to the other.

Moreover, if you don't limit the traffic, the attacker can technically send a request to any cluster pod to discover more vulnerabilities.

So, how can you restrict the network in your cluster?

K8s provides an object named NetworkPolicy that you can deploy on each namespace.

This CRD will determine who is authorized to send traffic to a given workload, which you call ingress rules. Moreover, where can this workload send traffic? That is the egress rule.

You can authorize outside communication from the network policy object by defining the authorized port or limiting the authorized addresses.

Regarding internal communication in your cluster, you can define rules using a namespace selector, a pod selector, or even both.

To simplify your configuration journey, [isovalent](https://editor.networkpolicy.io/) has built a webpage that helps you configure the network policy.

Again, one crucial point is that the K8s network policy is designed to create rules on layer four based on the IP address.

But if you’re also planning to add rules on Layer 7 or anything related, such as the URL or getting post parameters, then the default K8S network policy would be a limitation. This is why the container runtime interface, like Cilium, will manage your network using eBPF and provide new CRDs like the ciliumNetworkPolicy that will support L4 and L7 rules. To learn more about Cilium, check the related episode: [What are Cilium and Hubble](https://www.youtube.com/watch?v=H5RqSAX-eo4&t=3s&pp=ygUXaXMgaXQgb2JzZXJ2YWJsZSBjaWxpdW0%3D).

The other important aspect is encrypting the network traffic running in your cluster, which can be done quickly using a service mesh.

I have done several episodes on ServiceMesh, Istio, Kuma, and Linkerd on this channel, so I recommend watching those videos to understand more:

- [What is ServiceMesh and specially what is Istio?](https://www.youtube.com/watch?v=mOxF4cdBTd8)

- [What is Kuma?](https://www.youtube.com/watch?v=Xtysd5JBmsE&pp=ygUVaXMgaXQgb2JzZXJ2YWJsZSBrdW1h)

- [What is Linkerd and can we observe it?](https://www.youtube.com/watch?v=-7KjZGpqHOg&pp=ygUYaXMgaXQgb2JzZXJ2YWJsZSBsaW5rZXJk)

## Restrict the resource usage

The last and essential part is limiting resource usage of your namespaces. Why?

Let’s say you have a frontend service exposed to the outside world through an ingress rule service mesh or the gateway API. If an attacker starts running a DDoS attack that is not filtered by a proxy or any other security components and your frontend workload has autoscaling rules in place, the DDoS attack will result in adding more and more replicas.

By creating a resource quota, you’re building a gatekeeper to prevent adding too many resources to your cluster during this attack.

The DDoS attack could also be managed using rate-limiting rules provided by servicemesh. Where you can define how many requests can be sent by a given IP address/ web session.

## Runtime Vulnerability

Once your policies are in place, you have restricted your network and defined limited permissions. You need tools to help you identify suspicious events in your cluster.

Again, as mentioned, you may run code considered vulnerable in your cluster, which could result in a backdoor to your cluster.

In that case, you want to be alerted or block any suspicious activities. For example, a process that suddenly tries to access the password folder or tries to change the privileges of a workload

Various tooling is available in the CNCF landscape: [Falco](https://falco.org/), [Tetragon](https://tetragon.io/), [Kubearmor](https://kubearmor.io/), and more.

That solution will rely on the rules you need to define. Those rules will determine the set of actions that you would like to block or simply notify.

The last part uses runtime scanners, which continuously scan your applications for known vulnerabilities. As mentioned, you need to understand that existing code could be vulnerable. The advantages of these solutions are that they look at the libraries loaded and used when users interact with your system.

Plenty of commercial solutions, like [Trivy](https://trivy.dev/), [Dynatrace](https://www.dynatrace.com/), and more, provide that type of solution.

Detecting a vulnerable library is one thing, but knowing which user journey is impacted by the vulnerability is even better. Understanding which distributed traces are impacted is super powerful. As usual, you need to collect many details to share with your dev team.

## What I haven’t covered

There are a few critical aspects I haven't covered yet, but they’re obviously important:

- Node Security: The nodes in your cluster must be on a private network. Ensure they use a recent kernel and are installed behind a firewall to limit access.

- Observability: I haven't detailed how to collect data from all these best practices, but continuously tracking security is essential for observability. Implementing security measures is one thing; monitoring and maintaining those practices is even more crucial.

Let me know if you'd like to learn more about these topics. I could cover them in a future video.

## Enhancing Kubernetes Deployment Security

In application-level security, developers and administrators are advised to adhere to several best practices. One begins by writing secure code and constructing secure images, coupled with the continuous scanning of applications to detect vulnerabilities. This is complemented by the use of runtime scanners that alert users to any vulnerable workloads present. Controlling permissions is also crucial; assigning the right permissions to applications is important, steering clear of granting root access whenever possible. One can assign more restrictive permissions by utilizing security contexts, thus enhancing security.

Implementing PodSecurityPolicies is recommended to prevent human error from compromising the system. Moreover, configuring Role-Based Access Control (RBAC) appropriately for service accounts, deployment tools, and users who access the cluster is essential to maintaining a tight security posture.

When managing sensitive information, Kubernetes (K8s) Secrets is suggested. However, reliance on default base64 encodings should be avoided. Instead, solutions like external secret operators can offer more secure storage options.

API protection also plays a pivotal role in safeguarding Kubernetes environments. Enabling Transport Layer Security (TLS) and employing secure certificates for the Kubernetes client (kubectl) ensures the protection of your Kubernetes API.

On the network security front, limiting internal network traffic is advisable. This can be achieved through network policies or the implementation of a service mesh. Additionally, securing external communications is of utmost importance. Using ingress certificates or turning to third-party proxies to filter unsafe clients helps safeguard communications that are exposed to the external world.

In summary, each of these practices contributes to creating a secure, robust environment for applications, sensitive data, and network traffic, thus fortifying the overall security of Kubernetes deployments.
