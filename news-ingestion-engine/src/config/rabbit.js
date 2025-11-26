const amqp = require('amqplib');

let channel = null;

const connectRabbit = async () => {
    if (channel) return channel; // Return existing connection if open

    try {
        console.log("🐰 Connecting to RabbitMQ...");
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://user:password@localhost:5672');
        channel = await connection.createChannel();
        
        // Create the queue if it doesn't exist
        await channel.assertQueue('ingest_queue', { durable: true });
        
        console.log("✅ RabbitMQ Connected");
        return channel;
    } catch (err) {
        console.error("❌ RabbitMQ Connection Failed:", err.message);
        throw err;
    }
};

module.exports = { connectRabbit };