/*
 * @TODO this have to be generated by the php engine
 */
define([], function () {
    'use strict';

    return {
        core: {
            ApplicationManager: {
                appPath: 'resources/toolbar/src/tb/apps',

                /*ne charge que les onglets qui se trouvent dans 'applications'*/
                active: 'main',

                route: '', // to change: App should know

                applications: {
                    main: {
                        label: 'Main',
                        config: {mainRoute: 'appMain/index'}
                    },
                    layout: {
                        label: 'Layout',
                        config: {mainRoute: 'appLayout/home'}
                    },
                    content: {
                        label: 'Content edition',
                        config: {}
                    },
                    bundle: {
                        label: 'Bundle',
                        config: {mainRoute: 'bundle/index'}
                    },
                    page: {
                        label: 'Page',
                        config: {mainRoute: 'page/index'}
                    },
                    contribution: {
                        label: 'Contribution',
                        config: {mainRoute: 'contribution/index'}
                    },
                    user: {
                        label: 'User',
                        config: {mainRoute: 'user/index'}
                    }
                }
            }
        },

        component: {
            logger: {
                level: 8,
                mode: 'devel'
            },
            'exceptions-viewer': {
                show: true
            }
        },

        plugins: {
            namespace: {
                core: 'src/tb/apps/content/plugins/',
                demo: ''
            },
            "core": {
                edit: {
                    accept: ['BlockDemo'],
                    config: {}
                },

                contentselector: {
                    accept: ['Home/HomeContainer'], //handle wildcard
                    config: {
                        appendPosition: "bottom", /* default */
                        'Home/HomeContainer': {
                            accept: ['article', 'paragraph']
                        }
                    }
                },
                contenttype: {

                    accept: ['Home/HomeContainer', 'BlockDemo'],
                    config: {}
                },
                parameters: {
                    accept: ['BlockDemo'],
                    config: {}
                },
                contentsetplus: {
                    accept: ['Container/OneColumn'],
                    config: {}
                },
                remove: {
                    accept: ['BlockDemo'],
                    config: {}
                }
            },
            "demo": { }
        }
    };
});
