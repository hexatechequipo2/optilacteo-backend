import { StorageService } from '../storage/storage.service';

const mockSend = jest.fn();
const mockS3Client = jest.fn();
const mockPutObjectCommand = jest.fn();
const mockDeleteObjectCommand = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation((config) => {
    mockS3Client(config);
    return { send: mockSend };
  }),
  PutObjectCommand: jest.fn().mockImplementation((input) => {
    mockPutObjectCommand(input);
    return { tipo: 'put', input };
  }),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => {
    mockDeleteObjectCommand(input);
    return { tipo: 'delete', input };
  }),
}));

describe('StorageService', () => {
  const originalEnv = process.env;
  let service: StorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      STORAGE_BUCKET: 'mi-bucket',
      STORAGE_PUBLIC_URL: 'https://cdn.test',
      STORAGE_ENDPOINT: 'https://r2.test',
      STORAGE_ACCESS_KEY_ID: 'key-id',
      STORAGE_SECRET_ACCESS_KEY: 'secret',
    };
    mockSend.mockResolvedValue({});
    service = new StorageService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('configura el cliente S3 con el endpoint y las credenciales del entorno', () => {
    expect(mockS3Client).toHaveBeenCalledWith({
      region: 'auto',
      endpoint: 'https://r2.test',
      credentials: {
        accessKeyId: 'key-id',
        secretAccessKey: 'secret',
      },
    });
  });

  describe('upload', () => {
    it('envía un PutObjectCommand con bucket, key, body y content type, y devuelve la key', async () => {
      const buffer = Buffer.from('contenido');

      const result = await service.upload('logos/a.png', buffer, 'image/png');

      expect(mockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'mi-bucket',
        Key: 'logos/a.png',
        Body: buffer,
        ContentType: 'image/png',
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].tipo).toBe('put');
      expect(result).toBe('logos/a.png');
    });

    it('propaga el error si el SDK falla', async () => {
      mockSend.mockRejectedValue(new Error('R2 caído'));

      await expect(
        service.upload('k', Buffer.from('x'), 'image/png'),
      ).rejects.toThrow('R2 caído');
    });
  });

  describe('delete', () => {
    it('envía un DeleteObjectCommand con bucket y key', async () => {
      await service.delete('logos/a.png');

      expect(mockDeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'mi-bucket',
        Key: 'logos/a.png',
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].tipo).toBe('delete');
    });

    it('propaga el error si el SDK falla', async () => {
      mockSend.mockRejectedValue(new Error('sin permisos'));

      await expect(service.delete('k')).rejects.toThrow('sin permisos');
    });
  });

  describe('getPublicUrl', () => {
    it('arma la URL pública con la base del entorno y la key', () => {
      expect(service.getPublicUrl('logos/a.png')).toBe(
        'https://cdn.test/logos/a.png',
      );
    });
  });
});