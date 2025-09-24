const cloudServices = require('./cloud-services');
const topicService = require('./topic-service');
const path = require('path');

async function testCloudIntegration() {
    console.log('🚀 Starting cloud services integration test...\n');

    try {
        // Test 1: Initialize cloud services
        console.log('1️⃣ Testing cloud services initialization...');
        await cloudServices.initialize();
        console.log('✅ Cloud services initialized successfully\n');

        // Test 2: Health check
        console.log('2️⃣ Running health check...');
        const healthCheck = await cloudServices.healthCheck();
        console.log('Health check result:', healthCheck);
        if (healthCheck.status === 'healthy') {
            console.log('✅ Health check passed\n');
        } else {
            throw new Error('Health check failed');
        }

        // Test 3: Test topic service
        console.log('3️⃣ Testing topic service...');
        await topicService.initialize();
        console.log('✅ Topic service initialized successfully\n');

        // Test 4: Create a test topic
        console.log('4️⃣ Creating test topic...');
        const testTopic = {
            title: 'Test Topic - Cloud Integration',
            description: 'This is a test topic to verify cloud integration',
            learning_objectives: [
                'Test cloud storage integration',
                'Verify Firestore connectivity'
            ],
            content: {
                company_logo: {
                    src: 'test-logo.png',
                    alt: 'Test Logo'
                },
                task_statement: 'Test Task Statement',
                task_steps: [
                    {
                        title: 'Test Step 1',
                        description: 'This is a test step',
                        instructions: 'Follow these test instructions',
                        images: [
                            {
                                src: 'test-image.png',
                                alt: 'Test Image'
                            }
                        ]
                    }
                ]
            },
            quiz: {
                title: 'Test Quiz',
                questions: []
            },
            chat_contexts: {
                test_context: 'This is a test chat context'
            }
        };

        const saveResult = await topicService.saveTopic(testTopic, 'test-user', 'test-topic-cloud-integration');
        console.log('✅ Test topic created:', saveResult.topicId);

        // Test 5: Load the test topic
        console.log('\n5️⃣ Loading test topic...');
        const loadResult = await topicService.loadTopic('test-topic-cloud-integration', 'test-user');
        console.log('✅ Test topic loaded successfully');
        console.log('Topic title:', loadResult.data.title);

        // Test 6: List topics
        console.log('\n6️⃣ Listing topics...');
        const listResult = await topicService.listTopics('test-user');
        console.log(`✅ Found ${listResult.topics.length} topics for test user`);

        // Test 7: Get topic stats
        console.log('\n7️⃣ Getting topic statistics...');
        const statsResult = await topicService.getTopicStats('test-user');
        console.log('✅ Topic stats:', statsResult.stats);

        // Test 8: Clean up - delete test topic
        console.log('\n8️⃣ Cleaning up test topic...');
        await topicService.deleteTopic('test-topic-cloud-integration', 'test-user');
        console.log('✅ Test topic deleted successfully');

        console.log('\n🎉 All tests passed! Cloud integration is working correctly.');
        console.log('\n📋 Summary:');
        console.log('   ✅ Firestore connection established');
        console.log('   ✅ Cloud Storage connection established');
        console.log('   ✅ Topic CRUD operations working');
        console.log('   ✅ Health checks passing');
        console.log('\n🚀 Your SCORM builder is ready for cloud storage!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('\n🔧 Troubleshooting tips:');
        console.error('   1. Make sure your .env file is configured correctly');
        console.error('   2. Verify your Google Cloud credentials have proper permissions');
        console.error('   3. Ensure the Firestore API is enabled in your Google Cloud project');
        console.error('   4. Check that the Cloud Storage API is enabled');
        console.error('   5. Verify the bucket name is correct and accessible');
        
        process.exit(1);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testCloudIntegration().catch(console.error);
}

module.exports = testCloudIntegration;

