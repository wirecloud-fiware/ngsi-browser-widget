/*
 * Copyright (c) 2015-2017 CoNWeT Lab., Universidad Politécnica de Madrid
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global NGSI, StyledElements */

(function (mp, se) {

    "use strict";

    var NGSIBrowser = function NGSIBrowser() {

        /* Context */
        mp.widget.context.registerCallback(function (newValues) {
            if (this.layout && ("heightInPixels" in newValues || "widthInPixels" in newValues)) {
                this.layout.repaint();
            }
        }.bind(this));

        /* Preferences */
        mp.prefs.registerCallback(function (newValues) {
            if ('ngsi_server' in newValues || 'use_user_fiware_token' in newValues || 'use_owner_credentials' in newValues || 'ngsi_tenant' in newValues || 'ngsi_service_path' in newValues) {
                this.updateNGSIConnection();
            }
            if ('extra_attributes' in newValues || 'type_column' in newValues || 'allow_delete' in newValues || 'allow_use') {
                createTable.call(this);
            }
            this.ngsi_source.goToFirst();
        }.bind(this));

        /* Wiring */
        mp.wiring.registerStatusCallback(() => {
            var new_allow_use = mp.prefs.get('allow_use') && mp.widget.outputs.selection.connected;
            if (new_allow_use !== this.allow_use) {
                createTable.call(this);
            }
        });

        mp.wiring.registerCallback("filter-by-type", function (type_info) {
            if (typeof type_info === "string") {
                try {
                    type_info = JSON.parse(type_info);
                } catch (error) {
                    throw new mp.wiring.EndpointValueError("Invalid NGSI type details");
                }
            }

            if (typeof type_info !== "object") {
                throw new mp.wiring.EndpointValueError("Invalid NGSI type details");
            }

            if (!("name" in type_info)) {
                throw new mp.wiring.EndpointTypeError("Invalid NGSI type details");
            }

            if (this.type_filter !== type_info.name) {
                this.type_filter = type_info.name;
                this.ngsi_source.goToFirst();
            }
        }.bind(this));

        this.layout = null;
        this.table = null;
    };

    NGSIBrowser.prototype.init = function init() {
        createNGSISource.call(this);
        this.updateNGSIConnection();

        this.layout = new se.VerticalLayout();
        createTable.call(this);

        this.layout.center.addClassName('loading');
        this.layout.insertInto(document.body);
        this.layout.repaint();

        this.create_entity_button = new se.Button({
            class: "se-btn-circle add-entity-button z-depth-3",
            iconClass: "fa fa-plus",
        });

        this.editor_config_output = mp.widget.createOutputEndpoint();
        this.template_output = mp.widget.createOutputEndpoint();
        this.update_entity_endpoint = mp.widget.createInputEndpoint(onUpdateEntity.bind(this));
        this.create_entity_endpoint = mp.widget.createInputEndpoint(onCreateEntity.bind(this));
        this.create_entity_button.addEventListener('click', function (button) {
            openEditorWidget.call(this, button, "create");
            this.template_output.pushEvent('{"id": "", "type": ""}');
        }.bind(this));

        this.layout.center.appendChild(this.create_entity_button);
    };

    NGSIBrowser.prototype.updateNGSIConnection = function updateNGSIConnection() {

        this.ngsi_server = mp.prefs.get('ngsi_server');
        var options = {
            request_headers: {},
            use_user_fiware_token: mp.prefs.get('use_user_fiware_token')
        };
        var tenant = mp.prefs.get('ngsi_tenant').trim();
        if (tenant !== '') {
            options.request_headers['FIWARE-Service'] = tenant;
        }
        var path = mp.prefs.get('ngsi_service_path').trim();
        if (path !== '' && path !== '/') {
            options.request_headers['FIWARE-ServicePath'] = path;
        }

        this.ngsi_connection = new NGSI.Connection(this.ngsi_server, options);
    };

    /* *************************************************************************/
    /* ***************************** HANDLERS **********************************/
    /* *************************************************************************/

    var openEditorWidget = function openEditorWidget(button, action) {
        if (this.editor_widget == null) {
            this.editor_widget = mp.mashup.addWidget('CoNWeT/json-editor/1.0', {refposition: button.getBoundingClientRect()});
            this.editor_widget.addEventListener('remove', onEditorWidgetClose.bind(this));
            // Crete a wiring connection for sending editor conf and initial contents
            this.editor_config_output.connect(this.editor_widget.inputs.configure);
            this.template_output.connect(this.editor_widget.inputs.input);
        }

        // Disconnect json editor output endpoint
        this.editor_widget.outputs.output.disconnect();

        // And reconnect it with the expected one
        switch (action) {
        case "edit":
            this.editor_config_output.pushEvent({
                "readonly": [
                    ["id"],
                    ["type"]
                ]
            });
            this.editor_widget.outputs.output.connect(this.update_entity_endpoint);
            break;
        case "create":
            this.editor_config_output.pushEvent({
                "readonly": []
            });
            this.editor_widget.outputs.output.connect(this.create_entity_endpoint);
            break;
        }
    };

    var onEditorWidgetClose = function onEditorWidgetClose() {
        this.editor_widget = null;
    };

    var onUpdateEntity = function onUpdateEntity(data_string) {
        var data = JSON.parse(data_string);
        this.ngsi_connection.v2.replaceEntityAttributes(data, {keyValues: true}).then(() => {
            this.ngsi_source.refresh();
            if (this.editor_widget != null) {
                this.editor_widget.remove();
            }
        });
    };

    var onCreateEntity = function onCreateEntity(data_string) {
        var data = JSON.parse(data_string);
        this.ngsi_connection.v2.createEntity(data, {keyValues: true}).then(() => {
            this.ngsi_source.refresh();
            if (this.editor_widget != null) {
                this.editor_widget.remove();
            }
        });
    };

    var onRowClick = function onRowClick(row) {
        if (!mp.prefs.get("allow_use")) {
            mp.wiring.pushEvent('selected-row', row);
        }
    };

    var createNGSISource = function createNGSISource() {
        this.ngsi_source = new se.PaginatedSource({
            'pageSize': 20,
            'requestFunc': function (page, options, onSuccess, onError) {
                var types, orderBy;

                if (this.ngsi_connection !== null) {
                    var id_pattern = mp.prefs.get('ngsi_id_filter');
                    if (id_pattern === '') {
                        id_pattern = '.*';
                    }
                    if (this.type_filter) {
                        types = this.type_filter;
                    } else {
                        types = mp.prefs.get('ngsi_entities').trim();

                        if (types === "") {
                            types = undefined;
                        }
                    }
                    if (options.order && options.order.length > 0) {
                        orderBy = options.order.map((field) => {return field.replace(/^-/, "!");}).join(',');
                    }

                    this.ngsi_connection.v2.listEntities({
                        count: true,
                        idPattern: id_pattern,
                        keyValues: true,
                        limit: options.pageSize,
                        offset: (page - 1) * options.pageSize,
                        type: types,
                        orderBy: orderBy
                    }).then(
                        (response) => {
                            onSuccess(response.results, {
                                resources: response.results,
                                total_count: response.count,
                                current_page: page
                            });
                        },
                        onError
                    );
                } else {
                    onSuccess([], {resources: [], total_count: 0, current_page: 0});
                }
            }.bind(this)
        });
        this.ngsi_source.addEventListener('requestStart', function () {
            this.layout.center.disable();
        }.bind(this));
        this.ngsi_source.addEventListener('requestEnd', function () {
            this.layout.center.enable();
        }.bind(this));
    };

    var createTable = function createTable() {
        var fields, extra_attributes, i;

        // Create the table
        fields = [
            {field: 'id', label: 'Id', sortable: false}
        ];
        if (mp.prefs.get('type_column')) {
            fields.push({field: 'type', label: 'Type', sortable: false});
        }

        extra_attributes = mp.prefs.get('extra_attributes').trim();
        if (extra_attributes !== "") {
            extra_attributes = extra_attributes.split(new RegExp(',\\s*'));
            for (i = 0; i < extra_attributes.length; i++) {
                fields.push({field: extra_attributes[i], sortable: true});
            }
        }

        this.allow_use = mp.prefs.get('allow_use') && mp.widget.outputs.selection.connected;
        if (mp.prefs.get('allow_edit') || mp.prefs.get('allow_delete') || this.allow_use) {
            fields.push({
                label: 'Actions',
                width: '120px',
                contentBuilder: function (entry) {
                    var content, button;

                    content = new se.Container({class: "btn-group"});

                    if (mp.prefs.get('allow_edit')) {
                        button = new se.Button({'iconClass': 'fa fa-pencil', 'title': 'Edit'});
                        button.addEventListener('click', function (button) {
                            openEditorWidget.call(this, button, "edit");
                            this.template_output.pushEvent(JSON.stringify(entry));
                        }.bind(this));
                        content.appendChild(button);
                    }

                    if (mp.prefs.get('allow_delete')) {
                        button = new se.Button({'class': 'btn-danger', 'iconClass': 'fa fa-trash', 'title': 'Delete'});
                        button.addEventListener("click", function () {
                            this.ngsi_connection.v2.deleteEntity({
                                id: entry.id,
                                type: entry.type
                            }).then(
                                this.ngsi_source.refresh.bind(this.ngsi_source),
                                (error) => {
                                    mp.widget.log(error);
                                }
                            );
                        }.bind(this));
                        content.appendChild(button);
                    }

                    if (this.allow_use) {
                        button = new se.Button({'class': 'btn-primary', 'iconClass': 'fa fa-play', 'title': 'Use'});
                        button.addEventListener("click", function () {
                            mp.wiring.pushEvent('selection', JSON.stringify(entry));
                        }.bind(this));
                        content.appendChild(button);
                    }

                    return content;
                }.bind(this),
                sortable: false
            });
        }

        this.table = new se.ModelTable(fields, {id: 'id', pageSize: 20, source: this.ngsi_source, 'class': 'table-striped'});
        this.table.addEventListener("click", onRowClick);
        this.table.reload();
        this.layout.center.clear();
        this.layout.center.appendChild(this.table);
    };

    var widget = new NGSIBrowser();
    window.addEventListener("DOMContentLoaded", widget.init.bind(widget), false);

})(MashupPlatform, StyledElements);
