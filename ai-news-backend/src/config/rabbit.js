import amqp from 'amqplib';

let channel = null;

export const connectRabbit = async () => {
    if (channel) return channel;
    
    try {
        console.log("🐰 Connecting to RabbitMQ...");
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();
        
        // Assert queues
        await channel.assertQueue('ingest_queue', { durable: true });
        await channel.assertQueue('generation_queue', { durable: true });
        
        console.log("✅ RabbitMQ Connected");
        return channel;
    } catch (err) {
        console.error("❌ RabbitMQ Connection Failed:", err.message);
        throw err;
    }
};