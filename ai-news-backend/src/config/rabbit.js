import amqp from 'amqplib';

let channel = null;
let connection = null;

const resetState = () => {
  channel = null;
  connection = null;
};

export const connectRabbit = async () => {
  if (channel) return channel;

  try {
    console.log('Connecting to RabbitMQ...');
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    connection.on('close', resetState);
    connection.on('error', resetState);
    channel.on('close', () => {
      channel = null;
    });
    channel.on('error', () => {
      channel = null;
    });

    await channel.assertQueue('ingest_queue', { durable: true });
    await channel.assertQueue('generation_queue', { durable: true });

    console.log('RabbitMQ connected');
    return channel;
  } catch (error) {
    console.error('RabbitMQ connection failed:', error.message);
    resetState();
    throw error;
  }
};

for (const signal of ['SIGINT', 'SIGTERM', 'beforeExit']) {
  process.on(signal, async () => {
    try {
      if (channel) await channel.close();
    } catch {}
    try {
      if (connection) await connection.close();
    } catch {}
    resetState();
  });
}
