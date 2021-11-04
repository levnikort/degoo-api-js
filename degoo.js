const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const { Buffer } = require('buffer');
const FormData = require('form-data');

const debug = {
    success: (method, options={}) => {
        if (method === 'upload' || method === 'getBucketWriteAuth4')
            console.log({
                status: true,
                method,
                ...options
            });
        
        return options;
    },

    error: (method, error) => {
        console.log({
            status: false,
            method,
            error
        });
        
        return false;
    }
}

const degoo = {
    config: {
        properties: `ID\nMetadataID\nUserID\nDeviceID\nMetadataKey\nName\nFilePath\nLocalPath\nLastUploadTime\nLastModificationTime\nParentID\nCategory\nSize\nPlatform\nURL\nThumbnailURL\nCreationTime\nIsSelfLiked\nLikes\nComments\nIsHidden\nIsInRecycleBin\nDescription\nLocation {\nCountry\nProvince\nPlace\nGeoLocation {\nLatitude\nLongitude\n}\n}\nData\nDataBlock\nCompressionParameters\nShareinfo {\nStatus\nShareTime\n}`,
        limitMax: 2147483646,
        blockSize: 65536,
        token: '',
        rootPath: '',
        apiToken: 'da2-vs6twz5vnjdavpqndtbzg3prra',
        apiUrl: 'https://production-appsync.degoo.com/graphql',
        registerUrl: 'https://rest-api.degoo.com/register',
        loginUrl: '',
        requestOptions: {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
                'x-api-key': 'da2-vs6twz5vnjdavpqndtbzg3prra'
            }
        },
    },

    async auth(email, password) {
        if (await this.sessionCheck())
            return debug.success('auth', {
                token: this.config.token,
                pathId: this.config.rootPath
            });

         try {
            const result = await axios.post(this.config.registerUrl, {
                CountryCode: "RU",
                LanguageCode: "ru-RU",
                Password: password,
                Source: "Web App",
                Username: email,
            }, this.config.requestOptions);

            this.config.token = result.data.Token;
            this.config.rootPath = result.data.Redirect.replace('/my-files/', '');

            this.sessionSave();

            return debug.success('auth', {
                token: result.data.Token,
                pathId: this.config.rootPath
            });
        } catch (err) {
            return debug.error('auth', err);
        }
    },

    async profile() {
        const query = `query GetUserInfo3($Token: String!) {
            getUserInfo3(Token: $Token) {
            ID
            FirstName
            LastName
            Email
            AvatarURL
            CountryCode
            LanguageCode
            Phone
            AccountType
            UsedQuota
            TotalQuota
            OAuth2Provider
            GPMigrationStatus
            }
        }`;

        const request = {
            "operationName": "GetUserInfo3",
            "variables": {
                "Token": this.config.token,
            },
            "query": query
        }

        try {
            const result = await axios.post(this.config.apiUrl, request, this.config.requestOptions);

            return debug.success('profile', {profile: result.data.data.getUserInfo3})
        } catch (err) {
            return debug.error('profile', err);
        }
    },

    async sessionCheck() {
        if (fs.existsSync('session.txt')) {
            const session = fs.readFileSync('session.txt', 'utf-8');
            this.config.token = session;
            const {status} = await this.profile();
            if (status) {
                return true;
            }
        }

        return false;
    },

    sessionSave() {
        fs.writeFileSync('session.txt', this.config.token);
    },

    checkSum(filename, callback) {
        const seed = Buffer.from([13, 7, 2, 2, 15, 40, 75, 117, 13, 10, 19, 16, 29, 23, 3, 36]);
        let hash = crypto.createHash('sha1').update(seed);

        const stream = fs.createReadStream(filename, { highWaterMark: this.config.blocksize })

        stream.on('data', chunk => hash = hash.update(chunk));

        stream.on('end', () => {
            hash = hash.digest();
            let bytes = [];

            for (let b of hash) bytes.push(b);

            const cs = [].concat([10, bytes.length], bytes, [16, 0]);
            const checkSum = Buffer.from(cs).toString('base64');
            callback(checkSum.replace(/\W/g, '-'));
        });
    },

    async getOverlay4(pathId=0) {
        const query = `query GetOverlay4($Token: String!, $ID: IDType!) {getOverlay4(Token: $Token, ID: $ID) {${this.config.properties}}}`;

        const request = {
            "operationName": "GetOverlay4",
            "variables": {
                "Token": this.config.token,
                "ID": { "FileID": pathId }
            },
            "query": query
        }

        try {
            const result = await axios.post(this.config.apiUrl, request, this.config.requestOptions);
            return debug.success('getOverlay4');
        } catch (err) {
            return debug.error('getOverlay4', err);
        }
    },

    async getBucketWriteAuth4(pathId, hash, filename, size) {
        const query = `query GetBucketWriteAuth4(↵    $Token: String!↵    $ParentID: String!↵    $StorageUploadInfos: [StorageUploadInfo2]↵  ) {↵    getBucketWriteAuth4(↵      Token: $Token↵      ParentID: $ParentID↵      StorageUploadInfos: $StorageUploadInfos↵    ) {↵      AuthData {↵        PolicyBase64↵        Signature↵        BaseURL↵        KeyPrefix↵        AccessKey {↵          Key↵          Value↵        }↵        ACL↵        AdditionalBody {↵          Key↵          Value↵        }↵      }↵      Error↵    }↵  }`

        const request = {
            "operationName": "GetBucketWriteAuth4",
            "variables": {
                "Token": this.config.token,
                "ParentID": pathId,
                "StorageUploadInfos": [{
                    Checksum: hash,
                    FileName: filename,
                    Size: size.toString()
                }]
            },
            "query": query
        }

        try {
            const result = await axios.post(this.config.apiUrl, request, this.config.requestOptions);

            if (result.data.data.getBucketWriteAuth4[0].Error === 'Already exist!')
                return debug.success('getBucketWriteAuth4', {info: 'Already exist!'});
            else
                return debug.success('getBucketWriteAuth4', {info: result.data.data.getBucketWriteAuth4[0].AuthData});
        } catch (err) {
            return debug.error('getBucketWriteAuth4', err);
        }
    },

    async fileList(pathId=0) {
        const query = `query GetFileChildren3(↵    $Token: String!↵    $ParentID: String!↵    $Limit: Int!↵    $Order: Int↵    $NextToken: String↵  ) {↵    getFileChildren3(↵      Token: $Token↵      ParentID: $ParentID↵      Limit: $Limit↵      Order: $Order↵      NextToken: $NextToken↵    ) {↵      Items {↵        Name↵        FilePath↵        Size↵        ID↵        URL↵        ThumbnailURL↵        }↵      NextToken↵    }↵  }"`

        const request = {
            "operationName": "GetFileChildren3",
            "variables": {
                'Limit': 100,
                'ParentID': pathId.toString(),
                'Token': this.config.token,
            },
            "query": query
        }

        try {
            const result = await axios.post(this.config.apiUrl, request, this.config.requestOptions);

            return debug.success('fileList', {files: result.data.data.getFileChildren3.Items});
        } catch (err) {
            return debug.error('fileList', err);
        }
    },

    async uploadToDegoo(info, hash, name, type, path) {
        if (info === 'Already exist!') return false;

        const data = new FormData();

        data.append('key', `${info.KeyPrefix}${type}/${hash}.${type}`);
        data.append('acl', info.ACL);
        data.append('policy', info.PolicyBase64);
        data.append('signature', info.Signature);
        data.append(info.AccessKey.Key, info.AccessKey.Value);
        data.append('Cache-control', info.AdditionalBody[0].Value);
        data.append('Content-Type', `image/${type}`);
        data.append('file', fs.createReadStream(path), {
            filename: name,
            contentType: `image/${type}`,
        });
        
        data.getLength(async (err, len) => {
            try {
                axios.defaults.maxBodyLength = Infinity;
                axios.defaults.maxContentLength = Infinity;
                const result = await axios.post(info.BaseURL, data, {
                    headers: {
                        'content-length': len,
                        'content-type': `multipart/form-data; boundary=${data.getBoundary()}`,
                        'ngsw-bypass': 1,
                        'User-Agent': this.config.requestOptions.headers['User-Agent'],
                    }
                });

                return debug.success('uploadToDegoo', {uploadStatus: result.data});
            } catch (err) {
                return debug.error('uploadToDegoo', err);
            }
        });
    },

    async setUploadFile3(name, pathId, size="0", checksum="CgAQAg") {
        const query = `mutation SetUploadFile3($Token: String!, $FileInfos: [FileInfoUpload3]!) {↵    setUploadFile3(Token: $Token, FileInfos: $FileInfos)↵  }`;

        const request = {
            "operationName": "SetUploadFile3",
            "variables": {
                "Token": this.config.token,
                "FileInfos": [{
                    "Checksum": checksum,
                    "Name": name,
                    "CreationTime": +new Date(),
                    "ParentID": pathId,
                    "Size": size
                }]
            },
            "query": query
        }

        try {
            const result = await axios.post(this.config.apiUrl, request, this.config.requestOptions);
            return debug.success('setUploadFile3', {result: result.data.data});
        } catch (err) {
            return debug.error('setUploadFile3', err);
        }
    },

    async createDir(pathId, name) {
        await this.setUploadFile3(name, pathId);

        return await this.search(name, 1);
    },

    uploadDir(pathId, folderPath, removeNamespace=true) {
        let result = [];
        let content = fs.readdirSync(folderPath);

        content.forEach(async c => {
            if(fs.statSync(path.join(folderPath, c)).isFile()) {
                this.upload(path.join(folderPath, c), pathId, c);
            } else {
                let name = removeNamespace ? c : `${folderPath}/${c}`;

                const metaDir = await this.createDir(pathId, name);

                this.uploadDir(metaDir[0].ID, `${folderPath}/${c}`);
            }
        });
        return result;
    },

    upload(filePath, pathId=0, filename=false) {
        
        if (fs.statSync(filePath).isDirectory())
            return this.uploadDir(pathId, filePath);


        const fileInfo = {
            name: path.basename(filePath),
            type: path.extname(filePath).replace('.', ''),
            size: fs.statSync(filePath).size,
            path: filePath
        }

        const name = filename || fileInfo.name;

        this.checkSum(filePath, async hash => {
            await this.getOverlay4();
            const {info} = await this.getBucketWriteAuth4(pathId, hash, name, fileInfo.size);
            await this.uploadToDegoo(info, hash, name, fileInfo.type, filePath);

            const uploaded = await this.setUploadFile3(name, pathId, fileInfo.size, hash);

            const meta = await this.search(name, 1);

            return debug.success('upload', {meta});
        });
    },

    async share(fileId) {
        const query = `mutation SetShareFile(
            $Token: String!
            $FileIDs: [String]!
            $SetActive: Boolean!
            $ReadOnly: Boolean
            $Usernames: [String]
        ) {
            setShareFile(
            Token: $Token
            FileIDs: $FileIDs
            SetActive: $SetActive
            ReadOnly: $ReadOnly
            Usernames: $Usernames
            )
        }`;

        const request = {
            "operationName": "SetShareFile",
            "variables": {
                FileIDs: [fileId],
                ReadOnly: true,
                SetActive: true,
                "Token": this.config.token
            },
            "query": query
        }

        try {
            const {data} = await axios.post(this.config.apiUrl, request, this.config.requestOptions);

            return debug.success('share', {share: data.data.setShareFile});
        } catch (err) {
            return debug.error('share', err);
        }
    },

    async search(string, limit=200) {
        const query = `query GetSearchContent($Token: String!, $SearchTerm: String!, $Limit: Int!) {
            getSearchContent(Token: $Token, SearchTerm: $SearchTerm, Limit: $Limit) {
            Items {
                ID
                MetadataID
                MetadataKey
                Name
                FilePath
                LastModificationTime
                ParentID
                Size
                URL
                IsShared
            }
            NextToken
            }
        }`;

        const request = {
            "operationName": "GetSearchContent",
            "variables": {
                Limit: limit,
                SearchTerm: string,
                "Token": this.config.token
            },
            "query": query
        }

        try {
            const {data} = await axios.post(this.config.apiUrl, request, this.config.requestOptions);

            return debug.success('search', data.data.getSearchContent.Items);
        } catch (err) {
            return debug.error('search', err);
        }
    }
}

module.exports = degoo;