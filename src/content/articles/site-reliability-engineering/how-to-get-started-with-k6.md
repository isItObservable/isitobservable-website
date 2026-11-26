---
craftId: 142933
title: What is K6 & How to get started with k6
headline: What is K6 & How to get started with k6
subline: "**k6** is an open source tool and cloud service that makes load testing easy for developers and QA engineers"
date: 2022-06-02T15:31:00Z
author: giulia-di-pietro
topics:
  - site-reliability-engineering
  - performance-engineering
  - grafana
image:
  src: ~/assets/images/k6.png
  title: What is K6 & How to get started with k6
  alt: null
youtube: https://youtu.be/ZAq87eZ1w2U
related:
  - site-reliability-engineering/what-is-performance-engineering
  - site-reliability-engineering/how-to-create-chaos-experiments-with-litmus
  - site-reliability-engineering/what-is-chaos-engineering
  - site-reliability-engineering/get-started-with-sre-part-1
  - site-reliability-engineering/getting-started-with-sre-part-2
  - open-telemetry/traces/a-short-guide-to-opentelemetry
goDeeper:
  - text: View the tutorial on K6 on GitHub
    url: https://github.com/isItObservable/k6
seo:
  description: This blog post will explain K6 and its features and guide you through an example to get you started. Read now and learn more!
jsonLd:
  - "@context": https://schema.org
    "@type": FAQPage
    mainEntity:
      - "@type": Question
        name: What is k6?
        acceptedAnswer:
          "@type": Answer
          text: k6 is an open-source tool and cloud service designed for load testing. It helps developers and QA engineers test the performance of their applications by simulating a large number of users.
      - "@type": Question
        name: How do you install k6?
        acceptedAnswer:
          "@type": Answer
          text: k6 can be installed on various platforms including Windows, Linux, and macOS. It can also be run in a Docker environment using the official Docker image provided by the Grafana k6 team.
      - "@type": Question
        name: How do you create a test case in k6?
        acceptedAnswer:
          "@type": Answer
          text: A k6 test case is defined using JavaScript. You need to import the necessary libraries and manually define the request workflow to simulate real end-user traffic. For example, you can use 'http.get()' or 'http.post()' for HTTP requests.
      - "@type": Question
        name: What are some key features of k6?
        acceptedAnswer:
          "@type": Answer
          text: Key features of k6 include support for HTTP/1.1, HTTP/2, gRPC, and WebSocket protocols. It also offers extensions for other protocols like MQTT, AMQP, Kafka, and Redis. Additionally, k6 can integrate with external storage solutions like Prometheus and InfluxDB for storing load test statistics.
      - "@type": Question
        name: How can you validate responses in k6 tests?
        acceptedAnswer:
          "@type": Answer
          text: You can validate responses in k6 tests using the 'check' library. This allows you to ensure that the application under test is generating the expected responses, such as checking if the status code is 200.
---

In my previous blog post, I talked about performance engineering and mentioned various tools you can use for performance testing.

k6 is one of them: an open source tool developed by [Grafana Labs](https://grafana.com/). In this blog post, I’d like to share with you what k6 is, and what features it has and guide you through an example to get you started with k6.

## Introduction to k6

k6 is a package that can be installed either in bare metal (Windows, Linux - debian or Fedora, and Macos), or in a docker environment with the help of the official docker image provided by the Grafana k6 team.

The k6 client command line allows you to generate many users directly from the client. This means that the k6 client acts as a controller (component orchestrating the test ) and a load generator (component sending the traffic to your application under test).

k6 doesn’t provide a UI or dashboard to analyze your data. That’s why there are many extensions to help you store the load test statistics onto external storage, like Prometheus, InfluxDB, etc.

But a SaaS solution for cloud (k6 cloud) provides a WebUI to help you design, schedule, and run tests using several load generators, which is a better fit for enterprise use.

The k6 solution supports out-of-the-box HTTP (1.1 and 2, grpc and WebSocket). Still, there are several extensions for MQTT, AMQP, Kafka, Mllp, Redis, generating stress on your database level and driving a headless browser.

## How to build a test case in k6

Now, let’s move on to the practical part. Here’s how you can build a test case in k6.

A k6 test relies on a script defined in JavaScript using the k6 library. k6 doesn’t have a recorder, so you have to manually define the requests workflow that will help you reproduce real end-user traffic.

To start building your test case, you'll need to import the correct libraries:

For HTTP/HTTPS:

```javascript
import http from 'k6/http';
```

For grpc

```javascript
import grpc from 'k6/net/grpc';
```

For websocket

```
import ws from 'k6/ws or websocket
```

Once the import is done, you will be able to create a request. In the case of http:

```
http.get( )
```

or

```
http.post(url, pauload, params./.etc)
```

The request can have several properties, i.e.:

- Name the transaction

- Change the expected response code

- Tag your traffic to group request that are related (for example product/dedeed or product/5464563456 is at the end product/{product id})

If a transaction is a combination of several http requests you can group your request in a “transaction” with group:

```
group('visit product listing page', function () {
// ...
});
```

When you run your k6 test, it is also important to validate that the application is generating the expected responses. The Check library helps you validate your responses:

```
const res = http.get('http://test.k6.io/');
check(res, {
'is status 200': (r) => r.status === 200,
});
```

When designing your load test scenario, it’s really important to properly correlate your test to make it realistic. That is why you would probably need to extract content from the response, like the product ID, to use it on the subsequent request. The correlation mechanism can be easily applied by regexp on the res.body content.

### Test script structure

The test script of k6 is structured in the following way:

```
// 1. init code
Options{
}
export function setup() {
// 2. setup code
}
export default function (data) {
// 3. VU code
}
export function teardown(data) {
// 4. teardown code
}
```

The first section is the init, where we import the right libraries, and define global variables and settings of the test with the option object.

The setup (optional) is all the code that will run to set up the environment and build data used during the actual test. Default: the actual test that will iterate until the end of the test (defined in the options). Teardown (optional) runs at the test's end before the user ends.

To summarize, init will be executed once per virtual user, set up only once, the default will iterate the script for each vu during the entire test, and a teardown is executed once per script.

#### Options

The option object holds all the information related to your test:

- How many users to simulate

- How to ramp up

- The duration of the test

- How to ramp down

#### Thresholds

k6 allows you to define targets of tests by defining thresholds on statistics. For example:

```yaml
thresholds: {
http_req_failed: ['rate<0.01'], // http errors should be less than 1%
http_req_duration: ['p(95)<200'], // 95% of requests should be below 200ms
},
```

#### Metrics

k6 allows you to create metrics to report at the end of your tests. There are several metric types: Gauge, Rate, Counter, Trends.

You need to define in the init the metric type that you would like to build and add value to the metric in the default script.

For example:

```
const myGauge = new Gauge('my_gauge'); 
export default function () {
myGauge.add(3);
myGauge.add(1);
myGauge.add(2);
}
```

#### k6 commands

To run a test, you need to use the command “k6 run” and the name of your script .

```bash
k6 run test.js
```

**k6 report and results**

k6 will generate a summary report display in the output of the test. You can also specify if you want to generate a JSON file containing your test's data points ( with the option-out JSON file). You can also use an output extension to push the statistics to external storage.

### k6 extensions

k6 comes with a large number of extensions, which you can find listed here: [k6 Extensions](https://grafana.com/docs/k6/latest/extensions/)

K6 is built as an [xk6](https://github.com/grafana/xk6) tool that helps us build our k6 client by adding extensions.

To build the k6 client, we use the xk6 client :

```
xk6 build [<k6_version>] [--out /k6] [--with <module[@version][=replacement]>...]
```

k6 also provides a fantastic extension called **xk6-distributed tracing** to create the first open telemetry spans.

If you're testing a solution producing OpenTelemty measurement, then this plugin will be extremely helpful.

There is also another extension related to Kubernetes that facilitate the creation of distributed test in our cluster, it’s the **k6 operator.**

The operator adds a new CRD in our Kubernetes cluster: K6

That will hold all the settings to run a test :

```yaml
apiVersion: k6.io/v1alpha1
kind: K6
metadata:
name: k6-sample
spec:
parallelism: 4
script:
configMap:
name: k6-test
file: test.js
separate: false
runner:
image: <custom-image>
metadata:
labels:
cool-label: foo
annotations:
cool-annotation: bar
securityContext:
runAsUser: 1000
runAsGroup: 1000
runAsNonRoot: true
resources:
limits:
cpu: 200m
memory: 1000mi
requests:
cpu: 100m
memory: 500Mi
starter:
image: <custom-image>
metadata:
labels:
cool-label: foo
annotations:
cool-annotation: bar
securityContext:
runAsUser: 2000
runAsGroup: 2000
runAsNonRoot: true
```

## Tutorial

Now that we have an overview of what performance engineering is and what k6 looks like, let’s dive into the tutorial.

Here’s what you need to get started:

- A Kubernetes cluster

- An NGINX ingress controller

- The Google hipster-shop

- k6 operator

- The Prometheus operator

- OpenTelemetry Operator

Follow the full tutorial on my channel and on GitHub:

- Link to YouTube: [What is K6 & How to get started with k6](https://youtu.be/ZAq87eZ1w2U)

- Link to the GitHub repository: [K6 Tutorial](https://github.com/isItObservable/k6)
