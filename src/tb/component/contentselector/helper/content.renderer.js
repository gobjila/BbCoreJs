/*
 * Copyright (c) 2011-2013 Lp digital system
 *
 * This file is part of BackBee.
 *
 * BackBee is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * BackBee is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with BackBee. If not, see <http://www.gnu.org/licenses/>.
 */
require.config({
    paths: {
        'content.datastore': 'src/tb/component/contentselector/datastore/content.datastore'
    }
});
define(
    [
        'require',
        'content.datastore',
        'jsclass',
        'nunjucks',
        'jquery',
        'Core',
        'text!cs-templates/content.list.edit.view.tpl',
        'text!cs-templates/content.delete.tpl',
        'text!cs-templates/content.grid.view.tpl',
        'text!cs-templates/content.list.view.tpl'
    ],
    function (require) {
        'use strict';
        var nunjucks = require('nunjucks'),
            jQuery = require('jquery'),
            Core = require('Core'),
            ContentRenderer = new JS.Class({
                initialize: function () {
                    this.templates = {
                        viewmodelist: require('text!cs-templates/content.list.view.tpl'),
                        viewmodegrid: require('text!cs-templates/content.list.view.tpl'),
                        editmodelist: require('text!cs-templates/content.list.edit.view.tpl'),
                        editmodegrid: require('text!cs-templates/content.list.edit.view.tpl'),
                        deleteContent: require('text!cs-templates/content.delete.tpl')
                    };
                    this.itemData = null;
                    this.restContentDataStore = require('content.datastore');
                    this.popinManager = require('component!popin');
                    this.popin = this.popinManager.createPopIn({
                        modal: true,
                        minHeight: 200,
                        minWidth: 450,
                        title: "Content preview"
                    });
                    this.mode = "viewmode";
                },

                setEditMode: function () {
                    this.mode = "editmode";
                },

                setViewMode: function () {
                    this.mode = "viewmode";
                },

                setSelector: function (selector) {
                    this.selector = selector;
                },

                getSelector: function () {
                    return this.selector;
                },

                bindContentEvents: function (item, itemData) {
                    item = jQuery(item);
                    item.on('click', ".show-content-btn", jQuery.proxy(this.showContentPreview, this, itemData));
                    item.on('click', ".del-content-btn", jQuery.proxy(this.deleteContent, this, itemData));
                    item.on('click', ".addandclose-btn", jQuery.proxy(this.addAndCloseContent, this, itemData));
                    return item;
                },

                /* use cache, load item template according to render mode*/
                render: function (renderMode, item) {
                    var itemData = item;
                    renderMode = this.mode + renderMode;
                    item = nunjucks.renderString(this.templates[renderMode], item);
                    return this.bindContentEvents(item, itemData);
                },

                addAndCloseContent: function (itemData, e) {
                    e.preventDefault();
                    this.getSelector().selectItems(itemData);
                    this.getSelector().close();
                    return false;
                },

                showContentPreview: function (itemData) {
                    var self = this;
                    self.popin.setContent(jQuery("<p></p>"));
                    self.popin.display();
                    self.popin.mask();
                    self.addButtons();
                    jQuery.ajax({
                        url: "/rest/1/classcontent/" + itemData.type + '/' + itemData.uid,
                        dataType: 'html'
                    }).done(function (response) {
                        self.popin.unmask();
                        self.popin.setContent(jQuery(response));
                        self.popin.display();
                    }).fail(function (response) {
                        self.popin.unmask();
                        Core.exception('ContentRendererException', 57567, 'error while showing showContentPreview ' + response);
                    });
                },

                deleteContent: function (itemData) {
                    var self = this,
                        content;
                    self.itemData = itemData;
                    self.popin.setContent(jQuery("<p></p>"));
                    self.popin.mask();
                    self.addButtons();
                    self.popin.display();
                    jQuery.ajax({
                        url: "/rest/1/page",
                        data: {
                            content_uid: itemData.uid,
                            content_type: itemData.type
                        }
                    }).done(function (data) {
                        data = data || [];
                        var templateData = {
                            isOrphaned: (data.length === 0),
                            items: data
                        };
                        content = nunjucks.renderString(self.templates.deleteContent, templateData);
                        self.popin.unmask();
                        self.popin.setContent(jQuery(content));
                        self.popin.display();
                    }).fail(function (response) {
                        self.popin.unmask();
                        Core.exception('ContentRendererException', 57567, '[deleteContent] ContentRendererException error while deleting content ' + response);
                    });
                },

                addButtons: function () {
                    var self = this;
                    this.deleting = true;
                    self.popin.addButton('Yes', function () {
                        self.popin.setContent("<p>Please wait while the content is being deleted...</p>");
                        self.restContentDataStore.remove(self.itemData.type, self.itemData.uid);
                    });
                    self.popin.addButton("No", function () {
                        self.popin.hide();
                    });
                }
            });
        return ContentRenderer;
    }
);
