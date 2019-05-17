Introduction
============

The NGSI Browser widget allows you to browser [Orion Context
Broker](http://catalogue.fiware.org/enablers/publishsubscribe-context-broker-orion-context-broker)
servers in a easy and paginated way. This is done using the `queryContext`, so
updates made into the context broker are not reflected immediately when using
this widget.

> Latest version of this widget is always provided in [FIWARE
> Lab](https://store.lab.fiware.org/search/keyword/OrionStarterKit) where you
> can make use of it on the [Mashup portal](https://mashup.lab.fiware.org).
> Remember to take a look into the example mashups provided in the OrionStarterKit offering.

Settings
--------

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
  upgrade this widget.
- **NGSI tenant/service**: Tenant/service to use when connecting to the context
  broker. Must be a string of alphanumeric characters (lowercase) and the `_`
  symbol. Maximum length is 50 characters. If empty, the default tenant will be
  used
- **NGSI scope**: Scope/path to use when connecting to the context broker. Must
  be a string of alphanumeric characters (lowercase) and the `_` symbol
  separated by `/` slashes. Maximum length is 50 characters. If empty, the
  default service path will be used: `/`
- **NGSI entity types:** A comma separated list of entity types to use for
  filtering entities from the Orion Context broker. This field cannot be empty.
- **Id pattern:** Id pattern for filtering entities. This preference can be
  empty, in that case, entities won't be filtered by id.
- **Display Entity Type:** Display a column with the type of the entity.
- **Allow Edit:** Allow users to edit entities.
- **Allow Delete:** Allow users to remove entities.
- **Run button:** Display a use button to send entity data through the
  `selection` output endpoint. This button is not displayed if the endpoint is
  not connected.
- **Extra Attributes:** Comma separated list of attributes to be displayed in
  the widget as extra columns.
- **Perseo URL:** he URL to which Context Broker notifications will be sent
  when a subscription is created. If this field is empty the subscription
  function will not be available.

### Wiring

##### Input Endpoints

* This widget has no input endpoint

##### Output Endpoints

-   **Selection:** This widget sends an event thought this endpoint when the
    user clicks on the "Use Button". Entities using this widget uses the flat
    option of the WireCloud API. Event data example:

    ```json
    {
        "id": "van4",
        "type": "Van",
        "current_position": "43.47173, -3.7967205"
    }
    ```
-   **subscription:** This widget sends an event thought this endpoint when
    the user clicks on any option of the "Subscription menu Popup Button".
    Event data example:

    ```json
    {
       "description":"Perseo: Notify when FEDA5A0E entity changes",
       "subject":{
          "entities":[
             {
                "idPattern":"FEDA5A0E",
                "type":"SensorType"
             }
          ],
          "condition":{
             "attrs":[]
          }
       },
       "notification":{
          "http":{
             "url":"https://cep.example.com/notices"
          },
          "attrs":[]
       },
       "id":"5cdda832775bff91aa1c4472"
    }
    ```