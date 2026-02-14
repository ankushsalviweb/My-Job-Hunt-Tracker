/**
 * Common tech skills for autocomplete suggestions
 * @type {string[]}
 */
export const COMMON_SKILLS = [
    // Frontend
    'React', 'Angular', 'Vue.js', 'Next.js', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Tailwind CSS', 'Redux', 'jQuery',

    // Backend
    'Node.js', 'Python', 'Java', 'C#', '.NET', 'PHP', 'Ruby', 'Go', 'Rust', 'Scala', 'Kotlin',

    // Frameworks
    'Spring Boot', 'Django', 'Flask', 'Express.js', 'FastAPI', 'NestJS', 'Laravel', 'Rails',

    // Databases
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Oracle', 'SQL Server', 'DynamoDB', 'Cassandra',

    // Cloud & DevOps
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'CI/CD', 'Terraform', 'Ansible', 'Linux',

    // Data & ML
    'Machine Learning', 'Data Science', 'TensorFlow', 'PyTorch', 'Pandas', 'Spark', 'Hadoop', 'Power BI', 'Tableau',

    // API & Integration
    'REST API', 'GraphQL', 'Microservices', 'Kafka', 'RabbitMQ', 'gRPC',

    // Mobile
    'React Native', 'Flutter', 'iOS', 'Android', 'Swift', 'Kotlin',

    // Testing
    'Jest', 'Selenium', 'Cypress', 'JUnit', 'Pytest', 'Mocha',

    // Other
    'Git', 'Agile', 'Scrum', 'JIRA', 'System Design', 'DSA', 'OOP', 'Design Patterns'
];

/**
 * Get skill suggestions based on input
 * @param {string} input - User input
 * @param {string[]} existingSkills - Already selected skills
 * @param {string[]} userHistory - Previously used skills by user
 * @returns {string[]}
 */
export function getSkillSuggestions(input, existingSkills = [], userHistory = []) {
    const search = input.toLowerCase().trim();
    if (!search) return [];

    // Combine common skills with user history, prioritizing history
    const allSkills = [...new Set([...userHistory, ...COMMON_SKILLS])];

    // Filter out already selected and match input
    return allSkills
        .filter(skill =>
            !existingSkills.includes(skill) &&
            skill.toLowerCase().includes(search)
        )
        .slice(0, 8); // Limit to 8 suggestions
}
