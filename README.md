NGSI Browser widget
===================

The NGSI Browser widgets allows you to browser [Orion Context
Broker](http://catalogue.fiware.org/enablers/publishsubscribe-context-broker-orion-context-broker)
server in a easy and paginated way.

Latest version of this widget is always [provided in FIWARE
Lab](https://store.lab.fiware.org/search/keyword/OrionStarterKit) where you
can make use of it on the [Mashup portal](https://mashup.lab.fiware.org).
Remember to take a look into the example mashups provided in the OrionStarterKit offering.

Build
-----

Be sure to have installed [Node.js](http://node.js). For example, you can install it on Ubuntu and Debian running the following commands:

```bash
curl -sL https://deb.nodesource.com/setup | sudo bash -
sudo apt-get install nodejs
sudo apt-get install npm
```

Install other npm dependencies by running:

```bash
npm install
```

For build the widget you need download grunt:

```bash
sudo npm install -g grunt-cli
```

And now, you can use grunt:

```bash
grunt
```

If everything goes well, you will find a wgt file in the `dist` folder.

Settings and Usage
------------------

### Settings

- **NGSI server URL:** URL of the Orion Context Broker to use for retrieving
  entity information.
- **NGSI proxy URL:** URL of the Orion Context Broker proxy to use for receiving
  notifications about changes.
- **Use the FIWARE credentials of the user:** Use the FIWARE credentials of the
  user logged into WireCloud. Take into account this option cannot be enabled if
  you want to use this widget in a public workspace as anonoymous users doesn't
  have a valid FIWARE auth token. As an alternative, you can make use of the
  "Use the FIWARE credentials of the workspace owner" preference.
- **Use the FIWARE credentials of the dashboard owner**: Use the FIWARE
  credentials of the owner of the workspace. This preference takes preference
  over "Use the FIWARE credentials of the user". This feature is available on
  WireCloud 0.7.0+ in a experimental basis, future versions of WireCloud can
  change the way to use it making this option not funcional and requiring you to
  upgrade this operator.
- **NGSI entity types:** A comma separated list of entity types to use for
  filtering entities from the Orion Context broker. This field cannot be empty.
- **Id pattern:** Id pattern for filtering entities. This preference can be
  empty, in that case, entities won't be filtered by id.
- **Extra Attributes:** Comma separated list of attributes to be displayed in
  the widget as extra columns.

**NOTE** If you are using a custom instance of the Orion Context Broker, take
into account that by default Orion doesn't support sending notifications to
https endpoints. In those cases you can make use of a NGSI available through
http at (http://ngsiproxy.lab.fiware.org) instead of using the default one that
uses https (https://ngsiproxy.lab.fiware.org). Anyway, it is very recommended
to enable the https support (see this
[link](http://stackoverflow.com/questions/23338154/orion-context-broker-https-for-subscribers)
for more info about this matter).

### Wiring

##### Input Endpoints

* This widget has no input endpoint

##### Output Endpoints

-   **Selection:** This widget sends an event thought this endpoint when the
    user clicks on the "Use Button". Entities using this operator uses the flat
    option of the WireCloud API. Event data example:

    ```json
    {
        "id": "van4",
        "type": "Van",
        "current_position": "43.47173, -3.7967205"
    }
    ```

Copyright and License
---------------------

Copyright (c) 2015 CoNWeT Lab., Universidad Politecnica de Madrid

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
