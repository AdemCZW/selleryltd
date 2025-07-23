module.exports = {
    env: {
        browser: true,
        es2020: true,
        node: true
    },
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
            optionalChaining: true
        }
    },
    extends: ['eslint:recommended'],
    rules: {
        // Customize rules if needed
    }
};