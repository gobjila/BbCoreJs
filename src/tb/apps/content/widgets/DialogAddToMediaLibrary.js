/**
 * A dialog that asks the user if he need
 *
 */

define([ 'Core', 'component!popin', 'content.repository', 'BackBone', 'jquery', 'content.manager', 'component!session', 'jsclass'], function (Core, popinManager, ContentRepository, BackBone, jQuery, ContentManager, sessionMng) {

    'use strict';

    var instance = null,

        trans = require('Core').get('trans') || function (value) { return value; },

        validateId = 'validate-button',
        validateButton = "<span class='col-bb5-20'><button id='" + validateId + "' class='btn btn-default-grey'>" + trans("yes") + "</button></span>",
        cancelId = 'cancel-button',
        cancelButton = "<span class='col-bb5-20'><button id='" + cancelId + "' class='btn btn-default-grey'>" + trans("no") + "</button></span>",
        userChoiceCheckbox = "<div class='row form-group'><span class='col-bb5-100'><input id='user-choice' type='checkbox'></input> " + trans("remember_my_choice") + "</span></div>",
        dialogTemplate = "<div class='row form-group'>" + validateButton + cancelButton + "<span class='col-bb5-60'></span></div>" + userChoiceCheckbox,

        AddToMediaLibraryDialog = new JS.Class({

            STORAGE_KEY: 'save_in_medialibrary',
            TEXT_ELEMENT: 'Element/Text',
            ADD_TO_LIBRARY_MAP: 'component:medialibrary:add_to_library_map',
            States: {
                UNSELECT_STATE: 0,
                SELECT_STATE: 1
            },
            initialize: function () {
                jQuery.extend(this, {}, BackBone.Events);
                jQuery.extend(this, {}, this.States);
                this.state = this.States.UNSELECT_STATE;
                this.saveToMediaLibrary = false;
                this.showDialog = true;
                this.dialog = popinManager.createPopIn({
                    'modal': true
                });
                this.dialog.setTitle(trans("save_in_media_library"));
                this.dialog.setContent(jQuery(dialogTemplate));
                this.handleState();
            },

            getParams: function (elementType, key) {
                return Core.config(this.ADD_TO_LIBRARY_MAP + ':' + elementType + ':' + key);
            },

            addFilters: function (mediaDatastore) {
                mediaDatastore.addFilter("byContentType", function (params, restParams) {
                    restParams.criterias.contentType = params.contentType;
                    restParams.criterias.contentUid = params.contentUid;
                    return restParams;
                });

                return mediaDatastore;
            },

            throwException: function (contentType, property) {
                Core.exception('AddToLibraryException', 550, 'the "' + property + '" property of medialibrary:add_to_library_map section named"' + contentType + '" should be a string');
            },

            getAddToLibraryParams: function (content) {

                var transformInto = this.getParams(content.type, "transform_into"),
                    fileElement = this.getParams(content.type, "file_element"),
                    titleElement = this.getParams(content.type, "title_element");

                if (typeof transformInto !== 'string') {
                    this.throwException(content.type, 'transformInto');
                }

                if (typeof fileElement !== 'string') {
                    this.throwException(content.type, 'fileElement');
                }

                if (typeof titleElement !== 'string') {
                    this.throwException(content.type, 'titleElement');
                }

                return {
                    transformInto: transformInto,
                    fileElement: fileElement,
                    titleElement: titleElement
                };
            },


            init: function () {
                var content = this.dialog.getContent(),
                    processFn = null,
                    self = this,
                    isInMediaLibrary = false;

                Core.Mediator.subscribe('on:classcontent:beforedropmedia', function (context) {
                    if (!self.showDialog) { return; }
                    context.hasListener = true;
                    processFn = context.process;

                    ContentRepository.isInMedialibrary(context.content.getParent().uid).done(function (response) {
                        isInMediaLibrary = response;

                        self.show();
                    });
                });

                Core.Mediator.subscribe('on:classcontent:afterdropmedia', function (content, droppedFile, config) {
                    var title,
                        mediaData,
                        currentMediaContent = content.getParent(),
                        parent,
                        file,
                        contentParams = self.getAddToLibraryParams(content);

                    if (contentParams) {

                        if (false === isInMediaLibrary && false === self.saveToMediaLibrary) {
                            return;
                        }

                        config.updateCurrent = false;

                        Core.ApplicationManager.invokeService('content.main.getMediaDatastore').done(function (mediaDatastore) {

                            mediaDatastore = self.addFilters(mediaDatastore.getDataStore());

                            ContentManager.createElement(contentParams.transformInto).done(function (mediaContent) {

                                mediaContent.getData("elements").done(function (elements) {

                                    var callback = function (element, refreshElement) {
                                        var dfd = jQuery.Deferred();

                                        Core.ApplicationManager.invokeService('content.main.save', true).done(function () {

                                            var func = function () {
                                                refreshElement = refreshElement.getParent() || refreshElement;

                                                refreshElement.refresh().done(function () {
                                                    dfd.resolve();
                                                });
                                            };

                                            if (true === self.saveToMediaLibrary) {
                                                mediaData = {
                                                    title: droppedFile.name,
                                                    content_uid: element.uid,
                                                    content_type: contentParams.transformInto
                                                };

                                                mediaDatastore.save(mediaData, true).done(function () {
                                                    func();
                                                });
                                            } else {
                                                func();
                                            }
                                        });

                                        return dfd.promise();
                                    };

                                    if (!elements[contentParams.titleElement]) {
                                        Core.exception('AddToLibraryException', 550, contentParams.transformInto + " should have a '" + contentParams.titleElement + "' element");
                                    }

                                    if (!elements[contentParams.fileElement]) {
                                        Core.exception('AddToLibraryException', 550, contentParams.transformInto + " should have a '" + contentParams.titleElement + "' element");
                                    }

                                    if (self.TEXT_ELEMENT !== elements[contentParams.titleElement].type) {
                                        Core.exception('AddToLibraryException', contentParams.titleElement + " element of '" + contentParams.transformInto + "' should be an Element/Text");
                                    }

                                    if (content.type !== elements[contentParams.fileElement].type) {
                                        Core.exception('AddToLibraryException', contentParams.fileElement + " element of '" + contentParams.transformInto + "' should be an " + content.type);
                                    }

                                    title = ContentManager.buildElement({
                                        'type': elements[contentParams.titleElement].type,
                                        'uid': elements[contentParams.titleElement].uid
                                    });

                                    title.set("value", droppedFile.name);

                                    file = ContentManager.buildElement({
                                        'type': elements[contentParams.fileElement].type,
                                        'uid': elements[contentParams.fileElement].uid
                                    });

                                    file.setElements({'path': config.path, 'originalname': config.originalname});

                                    if (null !== currentMediaContent) {
                                        parent = currentMediaContent.getParent();
                                        if (parent !== null) {
                                            parent.getData('elements').done(function (parentElements) {
                                                var key;

                                                for (key in parentElements) {
                                                    if (parentElements.hasOwnProperty(key) && parentElements[key] !== null) {
                                                        if (parentElements[key].uid === currentMediaContent.uid) {
                                                            parent.addElement(key, {'uid': mediaContent.uid, 'type': mediaContent.type});
                                                        }
                                                    }
                                                }

                                                callback(mediaContent, currentMediaContent);
                                            });
                                        } else {
                                            callback(mediaContent, currentMediaContent);
                                        }
                                    } else {
                                        callback(mediaContent, currentMediaContent);
                                    }
                                });
                            });
                        });

                    }

                });

                jQuery(content).on('click', '#user-choice', this.handleClick.bind(this));
                jQuery(content).on('click', '#' + validateId, function () {
                    self.dialog.hide();
                    if (self.getState() === self.States.SELECT_STATE) {
                        sessionMng.setItem(self.STORAGE_KEY, self.States.SELECT_STATE);
                    }
                    self.saveToMediaLibrary = true; //do save the media in the media library

                    self.trigger('save', self.getState());
                    if (typeof processFn === 'function') {
                        processFn();
                    }
                });

                jQuery(content).on('click', '#' + cancelId, function () {
                    self.dialog.hide();
                    if (self.getState() === self.States.SELECT_STATE) {
                        sessionMng.setItem(self.STORAGE_KEY, self.States.UNSELECT_STATE); // save_to_medialibray = 0
                    }
                    self.saveToMediaLibrary = false; //do not save the media in the media library
                    if (typeof processFn === 'function') {
                        processFn();
                    }
                });
            },

            handleState: function () {
                /* retrive state from session */
                var saveState = sessionMng.getItem(this.STORAGE_KEY);
                if (typeof saveState === 'number') {
                    this.state = saveState;
                    if (this.state === this.States.SELECT_STATE) {
                        this.saveToMediaLibrary = true;
                        this.showDialog = false;
                    }
                }
            },

            handleClick: function (e) {

                if (jQuery(e.currentTarget).is(':checked')) {
                    this.setState(this.States.SELECT_STATE);
                    this.showDialog = false;
                } else {
                    this.setState(this.States.UNSELECT_STATE);
                }
            },

            setState: function (state) {
                this.state = state;
            },

            getState: function () {
                return this.state;
            },

            show: function () {
                this.dialog.display();
            },

            hide: function () {
                this.dialog.hide();
            }
        });

    return {

        getInstance: function () {
            if (!instance) {
                instance = new AddToMediaLibraryDialog();
            }
            return instance;
        },

        AddToMediaLibraryDialog: AddToMediaLibraryDialog
    };

});