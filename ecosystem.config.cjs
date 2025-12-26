module.exports = {
    apps: [
        {
            name: 'velvet-api',
            cwd: './server',
            script: 'index.js',
            instances: 2,
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'production',
                PORT: 3002
            },
            max_memory_restart: '500M',
            error_file: './logs/api-error.log',
            out_file: './logs/api-out.log',
            merge_logs: true,
            time: true
        },
        {
            name: 'velvet-web',
            cwd: './client-nuxt',
            script: '.output/server/index.mjs',
            instances: 2,
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
                NITRO_PORT: 3000
            },
            max_memory_restart: '1G',
            error_file: './logs/web-error.log',
            out_file: './logs/web-out.log',
            merge_logs: true,
            time: true
        }
    ]
};
