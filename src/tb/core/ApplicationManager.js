/**
 * bb.ApplicationManager
 * Responsability
 *  - provide an application skeleton
 *  - What is an application
 *  Application handle views
 *  [-View 1]
 *  [-View 2]
 *  [-View 3]
 *  [-View 4]
 *  application recieves requests via route
 *
 *  /#layout/create ---> route is handled by Application Route
 *                      ---> Then controller is called
 *                          ---> Then the right method is invoked
 *                              --> The right template
 *
 *  Application can déclare many controller BackBone Controllers
 *  Application Manager
 **/
define('tb.core.ApplicationManager', ['require', 'BackBone', 'jsclass', 'jquery', 'underscore', 'tb.core.Utils', 'tb.core.ApplicationContainer', 'tb.core.Api', 'tb.core.ControllerManager'], function (require) {
    'use strict';
    /* Abstract Application with Interface */
    /* dependence */
    var $ = require('jquery'),
        bbAppContainer = require('tb.core.ApplicationContainer'),
        underscore = require('underscore'),
        coreApi = require('tb.core.Api'),
        Backbone = require('BackBone'),
        bbUtils = require('tb.core.Utils'),
        ControllerManager = require('tb.core.ControllerManager'),
        AppDefContainer = {},
        currentApplication = null,
        config = null,
        Api = {},
        AppContainer = bbAppContainer.getInstance(),
        /**
         * AbstractApplication
         */
        AbstractApplication = new JS.Class({
            initialize: function (config) {
                this.config = {};
                this.state = 0;
                underscore.extend(this, Backbone.Events);
                this.config = $.extend(true, this.config, config);
                //this.appControllers = this.registerControllers();
                this.onInit();
            },
            /*  registerControllers: function () {
                try {
                    return ControllerManager.getAppControllers();
                } catch (e) {
                    console.log('registerControllers', e);
                }
            },*/
            getMainRoute: function () {
                return this.config.mainRoute;
            },
            exposeMenu: function () {
                return;
            },
            dispatchToController: function (controller, action, params) {
                var def = new $.Deferred();
                ControllerManager.loadController(this.getName(), controller).done(function (controller) {
                    try {
                        params = underscore.rest(params); //# cf http://underscorejs.org/#rest
                        controller.invoke(action, params);
                    } catch (reason) {
                        def.reject(reason);
                    }
                }).fail(function (reason) {
                    def.reject(reason.message);
                });
                return def.promise();
            },
            /**
             * @TODO finalise setter
             *
             * [setControllerMng description]
             * @param {[type]} controllerMng [description]
             */
            setControllerMng: function (controllerMng) {
                return controllerMng;
            },
            onInit: function () {
                console.log('application init is called');
            },
            onStart: function () {
                this.trigger(this.getName() + ':onStart');
            },
            onStop: function () {},
            onResume: function () {},
            onError: function (e) {
                console.log('error in[' + this.name + '] application', e);
            }
        }),
        /**
         * @TODO Unused At Remove ?
         * clean app definition by removing
         */
        // cleanDefinition = function (definition) {
        //     var forbidenActions = [],
        //         prop = '';

        //     for (prop in definition) {
        //         if (definition.hasOwnProperty(prop)) {
        //             console.log('ok');
        //         }
        //     }
        //     console.log(forbidenActions);
        // },
        /*url --> router --> appManager --> controller --> action*/
        /**
         * var app = getAppByRoute(route)
         * app.invoke(controller:action)
         *  - controller.init execute ation
         *
         **/
        registerApplication = function (appname, AppDef) {
            if ('string' !== typeof appname) {
                throw "ApplicationManager :appname should be a string";
            }
            if ('object' !== typeof AppDef) {
                throw 'ApplicationManager : appDef Is undefined';
            }
            var ApplicationConstructor = new JS.Class(AbstractApplication, AppDef);
            /**
             *
             */
            ApplicationConstructor.define('getName', (function (name) {
                return function () {
                    this.name = name;
                    return name;
                };
            }(appname)));
            if (AppDefContainer.hasOwnProperty(appname)) {
                coreApi.exception('ApplicationManagerException', 50007, 'An application named [' + appname + '] already exists.');
            }
            AppDefContainer[appname] = ApplicationConstructor;
        },
        registerAppRoutes = function (routes) {
            var def = new $.Deferred();
            return bbUtils.requireWithPromise(routes).done(function () {
                Api.trigger('routesLoaded');
                def.resolve.apply(this, arguments);
            }).fail(function (reason) {
                def.reject(reason);
            });
        },
        launchApplication = function (appname, config) {
            var dfd = new $.Deferred(),
                applicationInfos = AppContainer.getByAppInfosName(appname),
                Application = AppDefContainer[appname],
                instance;
            try {
                config = config || {};
                /* If the current application is called */
                if (currentApplication && (currentApplication.getName() === appname)) {
                    dfd.resolve(currentApplication);
                } else {
                    /** If app has not been loaded yet */
                    if (!applicationInfos) {
                        /** If app def can't be found */
                        if (!Application) {
                            return load(appname, config); //@TODO resolve 'load' was used before it was defined.
                        }
                        instance = new Application(config);
                        /** stop currentApplication */
                        applicationInfos = {
                            instance: instance,
                            name: appname
                        };
                        /** stop current application */
                        if (currentApplication) {
                            currentApplication.onStop();
                        }
                        AppContainer.register(applicationInfos);
                        applicationInfos.instance.onStart();
                        instance = applicationInfos.instance;
                    } else {
                        currentApplication.onStop();
                        /** application already exists call resume */
                        applicationInfos.instance.onResume();
                        instance = applicationInfos.instance;
                    }
                    currentApplication = instance;
                    dfd.resolve(currentApplication);
                }
            } catch (e) {
                console.log(e);
            }
            return dfd.promise();
        },
        load = function (appname, config) {
            var def = new $.Deferred(),
                completeAppname = ['app.' + appname];
            bbUtils.requireWithPromise(completeAppname).done(function () {
                launchApplication(appname, config).done(def.resolve);
            }).fail(function () {
                def.reject('Application[' + completeAppname + '] can\'t be found');
            });
            return def.promise();
        },
        /**
         * At this stage we are sure that all apps declared in applicationConfigs was loaded
         * And that the router was loaded
         * We can then load the 'active' app
         */
        appsAreLoaded = function () {
            var activeAppConf = config.applications[config.active] || {};
            if (activeAppConf.hasOwnProperty("config")) {
                activeAppConf = activeAppConf.config;
            }
            return load(config.active, activeAppConf).then(function (app) {
                Api.trigger('appIsReady', app); //use mediator
            });
        },
        reset = function () {
            //AppDefContainer = {};
            currentApplication = null;
            config = null;
            Api.off();
            AppContainer.reset();
        },
        handleAppLoadingErrors = function (reason) {
            Api.trigger('appError', {
                reason: reason
            });
        },
        init = function (configuration) {
            if (!configuration || !$.isPlainObject(configuration)) {
                coreApi.exception("ApplicationManagerException", 50001, 'init expects a parameter one to be an object.');
            }
            var routePaths = [],
                routeName = '',
                appPaths = [];
            config = configuration;
            if (!config.hasOwnProperty('appPath')) {
                coreApi.exception('ApplicationManagerException', 50002, 'InvalidAppConfig [appPath] key is missing');
            }
            if (!config.hasOwnProperty('applications')) {
                coreApi.exception('ApplicationManagerException', 50003, 'InvalidAppConfig [applications] key is missing');
            }
            if (!config.hasOwnProperty("active")) {
                coreApi.exception('ApplicationManagerException', 50004, 'InvalidAppConfig [active] key is missing');
            }
            if (!$.isPlainObject(configuration.applications)) {
                coreApi.exception('ApplicationManagerException', 50005, 'InvalidAppConfig [applications] should be an object');
            }
            if (underscore.size(config.applications) === 0) {
                coreApi.exception('ApplicationManagerException', 50006, 'InvalidAppConfig at least one application config should be provided');
            }
            $.each(config.applications, function (appname, appConfig) {
                appPaths.push(config.appPath + '/' + appname + '/main.js');
                /*handle alt route path here */
                routeName = appname + '.routes';
                if (appConfig.config.hasOwnProperty('routePath') && typeof appConfig.config.routePath === 'string') {
                    routeName = appConfig.config.routePath;
                }
                routePaths.push(routeName);
            });
            bbUtils.requireWithPromise(appPaths).then($.proxy(registerAppRoutes, null, routePaths)).done(appsAreLoaded).fail(handleAppLoadingErrors);
        },
        invoke = function (actionInfos, params) {
            params = params || {};
            if (!actionInfos || ('string' !== typeof actionInfos)) {
                coreApi.exception('ApplicationManagerException', 50009, 'Application.invoke actionInfos should be a string');
            }
            actionInfos = actionInfos.split(':');
            if (actionInfos.length !== 3) {
                coreApi.exception('ApplicationManagerException', 50010, 'Invalid actionInfos. Valid format {appname}:{controllerName}:{controllerAction}');
            }
            var appPromise = launchApplication(actionInfos[0]);
            appPromise.fail(function (reason) {
                Api.trigger("appError", {
                    reason: reason
                });
            });
            appPromise.done(function (application) {
                application.dispatchToController(actionInfos[1], actionInfos[2], params).done( /*trigger events here if needed*/ ).fail(function (e) {
                    Api.trigger("appError", {
                        reason: e
                    });
                });
            });
        };
    Api = {
        registerApplication: registerApplication,
        invoke: invoke,
        launchApplication: launchApplication,
        init: init,
        reset: reset
    };
    /* application as an Event emitter */
    underscore.extend(Api, Backbone.Events);
    coreApi.register('ApplicationManager', Api);
    return Api;
});