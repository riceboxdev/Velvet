const { db } = require('../server/config/database');
const Subscription = require('../server/models/Subscription');

async function seedPlans() {
    console.log('Seeding pricing plans...');

    const plans = [
        {
            name: 'Free',
            description: 'Get started with 1 waitlist',
            monthlyPrice: 0,
            annualPrice: 0,
            maxWaitlists: 1,
            maxSignupsPerMonth: 100,
            maxTeamMembers: 1,
            features: [
                'custom_branding',
                'email_verification',
                'csv_export'
            ],
            sortOrder: 0
        },
        {
            name: 'Basic',
            description: 'For individuals and small projects',
            monthlyPrice: 15,
            annualPrice: 120, // $10/mo
            maxWaitlists: null, // Unlimited
            maxSignupsPerMonth: null, // Unlimited
            maxTeamMembers: 1,
            features: [
                'custom_branding',
                'api_access',
                'webhooks',
                'slack_integration',
                'email_verification',
                'analytics_basic',
                'csv_export',
                'leaderboard'
            ],
            sortOrder: 1
        },
        {
            name: 'Advanced',
            description: 'For growing businesses',
            monthlyPrice: 50,
            annualPrice: 396, // $33/mo
            maxWaitlists: null,
            maxSignupsPerMonth: null,
            maxTeamMembers: 5,
            features: [
                // All Basic features
                'custom_branding',
                'api_access',
                'webhooks',
                'slack_integration',
                'email_verification',
                'analytics_basic',
                'csv_export',
                'leaderboard',
                // Advanced-only features
                'remove_branding',
                'zapier_integration',
                'hide_position_count',
                'block_personal_emails',
                'allowed_domains',
                'move_user_position'
            ],
            sortOrder: 2
        },
        {
            name: 'Pro',
            description: 'For power users and teams',
            monthlyPrice: 250,
            annualPrice: 2004, // $167/mo
            maxWaitlists: null,
            maxSignupsPerMonth: null,
            maxTeamMembers: null, // Unlimited
            features: [
                // All Basic features
                'custom_branding',
                'api_access',
                'webhooks',
                'slack_integration',
                'email_verification',
                'csv_export',
                'leaderboard',
                // All Advanced features
                'remove_branding',
                'zapier_integration',
                'hide_position_count',
                'block_personal_emails',
                'allowed_domains',
                'move_user_position',
                // Pro-only features
                'analytics_deep',
                'custom_email_templates',
                'custom_offboarding_email',
                'custom_domain_emails',
                'email_blasts',
                'multi_user_team'
            ],
            sortOrder: 3
        },
        {
            name: 'Enterprise',
            description: 'Custom solutions for large organizations',
            monthlyPrice: 0, // Custom pricing
            annualPrice: 0,
            maxWaitlists: null,
            maxSignupsPerMonth: null,
            maxTeamMembers: null,
            features: [
                // All features
                'custom_branding',
                'api_access',
                'webhooks',
                'slack_integration',
                'email_verification',
                'csv_export',
                'leaderboard',
                'remove_branding',
                'zapier_integration',
                'hide_position_count',
                'block_personal_emails',
                'allowed_domains',
                'move_user_position',
                'analytics_deep',
                'custom_email_templates',
                'custom_offboarding_email',
                'custom_domain_emails',
                'email_blasts',
                'multi_user_team',
                // Enterprise-only
                'sso',
                'custom_sla',
                'dedicated_support',
                'custom_features'
            ],
            sortOrder: 4,
            isEnterprise: true
        }
    ];

    for (const plan of plans) {
        // We'll use name as ID for simplicity in seeding, or just query by name to update
        // But Subscription.createPlan uses nanoid.
        // Let's first check if a plan with this name exists
        const existingPlans = await db.collection('subscription_plans')
            .where('name', '==', plan.name)
            .get();

        if (!existingPlans.empty) {
            console.log(`Plan ${plan.name} already exists. Updating...`);
            const doc = existingPlans.docs[0];
            await db.collection('subscription_plans').doc(doc.id).update({
                description: plan.description,
                monthly_price: plan.monthlyPrice,
                annual_price: plan.annualPrice,
                max_waitlists: plan.maxWaitlists,
                max_signups_per_month: plan.maxSignupsPerMonth,
                max_team_members: plan.maxTeamMembers,
                features: plan.features,
                sort_order: plan.sortOrder,
                is_enterprise: plan.isEnterprise || false
            });
        } else {
            console.log(`Creating plan ${plan.name}...`);
            await Subscription.createPlan(plan);
        }
    }

    console.log('Plans seeded successfully.');
    process.exit(0);
}

seedPlans().catch(console.error);
