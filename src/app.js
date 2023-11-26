import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import stripe from "stripe";

console.log("Env vars are:", process.env.REGION);

const client = new SecretsManagerClient({
  region: process.env.REGION,
});

let response;

try {
  response = await client.send(
    new GetSecretValueCommand({
      SecretId: process.env.STRIPE_SECRET_KEY_PATH,
      VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
    })
  );
} catch (error) {
  // For a list of exceptions thrown, see
  // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
  throw error;
}

const secret = response.SecretString;

const stripeConfig = stripe(secret);

export const lambdaHandler = async (event, context) => {
  const body = JSON.parse(event.body);
  try {
    const paymentIntent = await stripeConfig.paymentIntents.create(
      {
        amount: body.amount * 100,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
      },
      {
        stripeAccount: process.env.STRIPE_CONNECT_ACCOUNT_ID,
      }
    );

    console.log("Payment Intent: ", paymentIntent);

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
      }),
    };
  } catch (err) {
    console.log(err);
    throw err;
  }
};
