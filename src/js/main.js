/*
 * Copyright (c) 2015-2016 CoNWeT Lab., Universidad Politécnica de Madrid
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

        this.add_entity_button = new se.Button({
            class: "se-btn-circle add-entity-button z-depth-3",
            iconClass: "icon-plus",
        });

        this.editor_config_output = mp.widget.createOutputEndpoint();
        this.template_output = mp.widget.createOutputEndpoint();
        this.create_entity_endpoint = mp.widget.createInputEndpoint(onCreateEntity.bind(this));
        this.add_entity_button.addEventListener('click', function (button) {
            openEditorWidget.call(this, button);
            this.editor_config_output.pushEvent({
                "readonly": []
            });
            this.template_output.pushEvent('{"id": "", "type": ""}');
        }.bind(this));

        this.layout.center.appendChild(this.add_entity_button);
    };

    NGSIBrowser.prototype.updateNGSIConnection = function updateNGSIConnection() {

        this.ngsi_server = mp.prefs.get('ngsi_server');
        var options = {
            request_headers: {},
            use_user_fiware_token: mp.prefs.get('use_user_fiware_token')
        };
        var tenant = mp.prefs.get('ngsi_tenant').trim().toLowerCase();
        if (tenant !== '') {
            options.request_headers['FIWARE-Service'] = tenant;
        }
        var path = mp.prefs.get('ngsi_service_path').trim().toLowerCase();
        if (path !== '' && path !== '/') {
            options.request_headers['FIWARE-ServicePath'] = path;
        }

        this.ngsi_connection = new NGSI.Connection(this.ngsi_server, options);
    };

    /* *************************************************************************/
    /* ***************************** HANDLERS **********************************/
    /* *************************************************************************/

    var openEditorWidget = function openEditorWidget(button) {
        if (this.editor_widget == null) {
            this.editor_widget = mp.mashup.addWidget('CoNWeT/json-editor/1.0', {refposition: button.getBoundingClientRect()});
            this.editor_widget.addEventListener('remove', onEditorWidgetClose.bind(this));
            this.editor_config_output.connect(this.editor_widget.inputs.configure);
            this.template_output.connect(this.editor_widget.inputs.input);
            this.create_entity_endpoint.connect(this.editor_widget.outputs.output);
        }
    };

    var onEditorWidgetClose = function onEditorWidgetClose() {
        this.editor_widget = null;
    };

    var onCreateEntity = function onCreateEntity(data_string) {
        var data = JSON.parse(data_string);
        var entity = {
            id: data.id,
            type: data.type
        };
        delete data.id;
        delete data.type;

        var attributes = [];
        Object.keys(data).forEach(function (key) {
            attributes.push({name: key, contextValue: data[key]});
        });
        this.ngsi_connection.addAttributes(
            [{entity: entity, attributes: attributes}],
            {
                onSuccess: this.ngsi_source.refresh.bind(this.ngsi_source),
                onComplete: function () {
                    if (this.editor_widget != null) {
                        this.editor_widget.remove();
                    }
                }.bind(this)
            }
        );
    };

    var onRowClick = function onRowClick(row) {
        if (!mp.prefs.get("allow_use")) {
            mp.wiring.pushEvent('selected-row', row);
        }
    };

    var onNGSIQuerySuccess = function onNGSIQuerySuccess(next, page, data, details) {
        var search_info, i, j, attributes, attribute, entry;

        for (i = 0; i < data.length; i++) {
            entry = data[i];
            attributes = {};
            for (j = 0; j < entry.attributes.length; j++) {
                attribute = entry.attributes[j];
                attributes[attribute.name] = attribute.contextValue;
            }
            attributes.id = entry.entity.id;
            attributes.type = entry.entity.type;
            data[i] = attributes;
        }

        search_info = {
            'resources': data,
            'current_page': page,
            'total_count': details.count
        };

        next(data, search_info);
    };

    var createNGSISource = function createNGSISource() {
        this.ngsi_source = new se.PaginatedSource({
            'pageSize': 20,
            'requestFunc': function (page, options, onSuccess, onError) {
                var entityIdList, entityId, types, i, attributes;

                if (this.ngsi_connection !== null) {
                    entityIdList = [];
                    var id_pattern = mp.prefs.get('ngsi_id_filter');
                    if (id_pattern === '') {
                        id_pattern = '.*';
                    }
                    if (this.type_filter) {
                        types = [this.type_filter];
                    } else {
                        types = mp.prefs.get('ngsi_entities').trim();
                        if (types !== '') {
                            types = types.split(new RegExp(',\\s*'));
                        } else {
                            types = null;
                        }
                    }
                    if (types != null) {
                        for (i = 0; i < types.length; i++) {
                            entityId = {
                                id: id_pattern,
                                type: types[i],
                                isPattern: true
                            };
                            entityIdList.push(entityId);
                        }
                    } else {
                        entityId = {
                            id: id_pattern,
                            isPattern: true
                        };
                        entityIdList.push(entityId);
                    }

                    attributes = [];
                    this.ngsi_connection.query(entityIdList, attributes, {
                        details: true,
                        limit: options.pageSize,
                        offset: (page - 1) * options.pageSize,
                        onSuccess: onNGSIQuerySuccess.bind(null, onSuccess, page),
                        onFailure: onError
                    });
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
                fields.push({field: extra_attributes[i], sortable: false});
            }
        }

        if (mp.prefs.get('allow_delete') || mp.prefs.get('allow_use')) {
            fields.push({
                label: 'Actions',
                width: '120px',
                contentBuilder: function (entry) {
                    var content, button;

                    content = new se.Container({class: "btn-group"});

                    if (mp.prefs.get('allow_edit')) {
                        button = new se.Button({'iconClass': 'fa fa-pencil', 'title': 'Edit'});
                        button.addEventListener('click', function (button) {
                            openEditorWidget.call(this, button);
                            this.editor_config_output.pushEvent({
                                "readonly": [
                                    ["id"],
                                    ["type"],
                                ]
                            });
                            this.template_output.pushEvent(JSON.stringify(entry));
                        }.bind(this));
                        content.appendChild(button);
                    }

                    if (mp.prefs.get('allow_delete')) {
                        button = new se.Button({'class': 'btn-danger', 'iconClass': 'icon-trash', 'title': 'Delete'});
                        button.addEventListener("click", function () {
                            this.ngsi_connection.deleteAttributes(
                                [
                                    {'entity': {id: entry.id, type: entry.type}}
                                ],
                                {
                                    onSuccess: this.ngsi_source.refresh.bind(this.ngsi_source),
                                    onFailure: function (error) {
                                        mp.widget.log(error);
                                    }
                                }
                            );
                        }.bind(this));
                        content.appendChild(button);
                    }

                    if (mp.prefs.get('allow_use')) {
                        button = new se.Button({'class': 'btn-primary', 'iconClass': 'icon-play', 'title': 'Use'});
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
