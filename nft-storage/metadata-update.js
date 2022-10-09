import minimist from 'minimist'
import * as fs from 'fs'

const BASE_URI = 'https://bafybeibzmox3c34cldvi562kokjnskdp3pkcmikw7g3zkjarvdqwyeaznm.ipfs.w3s.link/Zkunks/'

function main() {
    const args = minimist(process.argv.slice(2))

    const path = args._[0]
    if (!(fs.lstatSync(path).isDirectory()) || (args._.length < 1)) {
        return console.error('Please supply the path to a directory')
    }

    fs.readdir(path, (err, files) => {
        files.forEach(filename => {
            const filepath = path + '/' + filename
            const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))

            data.image = BASE_URI + data.image;

            fs.writeFile(filepath, JSON.stringify(data, null, 4), function writeJSON(err) {
                if (err) return console.log(err);
                // console.log(JSON.stringify(data));
                console.log('writing to ' + filepath);
            });

        });
    });

}
main()

// function that load json file
function loadJSON(filename) {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
}