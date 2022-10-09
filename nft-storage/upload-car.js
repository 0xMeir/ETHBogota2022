import process from 'process'
import minimist from 'minimist'
import dotenv from 'dotenv'
import { Web3Storage } from 'web3.storage'
import { createReadStream } from 'fs';
import { CarReader } from '@ipld/car';

async function storeCarFile(client, filename) {
    const inStream = createReadStream(filename);
    const car = await CarReader.fromIterable(inStream);

    const cid = await client.putCar(car);
    console.log('Stored CAR file! CID:', cid);
}

async function main() {
    dotenv.config()
    const { token } = process.env
    if (!token) {
        throw new Error('TOKEN environment variable not found')
    }

    const args = minimist(process.argv.slice(2))

    if (!token) {
        return console.error('A token is needed. You can create one on https://web3.storage')
    }

    if (args._.length < 1) {
        return console.error('Please supply the path to a file or directory')
    }
    const client = new Web3Storage({ token });
    storeCarFile(client, args._[0]);
}

main()