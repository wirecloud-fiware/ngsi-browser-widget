## v3.0.0 (2019-05-XX)

- Use normalized payloads for entities, allowing to update attribute type and
  its metadata.
- Allow to order entities by id or type (requires support from the ontext broker
  server, e.g. orion v0.12.0 or higher)
- Added support for creating subscriptions on the browsed entities. Currently
  the support focus on creating subscriptions related to Perseo.
- Added a new output endpoint for notifiying when a subscriptions was created.
- Support uploading entities using files.


## v2.0.1 (2018-03-20)

- Upgrade to use FontAwesome 4
- Use case sensitive `FIWARE-Service` and `FIWARE-ServicePath` values to fix
  some problems


## v2.0.0 (2017-11-01)

- Migrate to use NGSI v2, dropping support for v1
- Proper support for creating and updating context broker entities
- Support for ordering entities by attribute values
- Only display the use button for entities if the selection output endpoint is
  connected


## v1.1.0 (2016-12-12)

- Added initial support for editing entities
- Added initial support for creating new entities
- Based on `json-editor` v1.0

## v1.0.2

- Add support for the `Fiware-ServicePath` used by the tenant/service feature
  from the Orion Context Broker
- Add a preference for enabling/disabling the type column
- Add preferences for enabling/disabling the delete and use buttons
- Improved widget metadata


## v1.0.1

- Add support for the Orion Context Broker tenant/service feature
- Use pixels and percentages for the initial size (this requries WireCloud 0.8.0+)


## v1.0.0

Initial NGSI browser version.
