import psycopg2
import binascii
from io import BytesIO
from PIL import Image
import filetype  # Para detectar o tipo de arquivo
from flask import Flask, jsonify, send_file, request
import os  # Importa a biblioteca para acessar variáveis de ambiente

app = Flask(__name__)

# Função para garantir que as pastas existam (não será mais necessário com Flask)
def criar_pasta(path):
    if not os.path.exists(path):
        os.makedirs(path)

# Função para buscar imagens do banco de dados
def buscar_imagens_do_banco():
    # String de conexão usando a variável de ambiente POSTGRES_URL
    dsn = os.getenv("POSTGRES_URL")
    
    # Verificação se a variável de ambiente foi configurada corretamente
    if not dsn:
        raise ValueError("A variável de ambiente POSTGRES_URL não foi encontrada.")
    
    try:
        # Conexão com o banco de dados
        con = psycopg2.connect(dsn)
        cursor = con.cursor()

        # Consulta para buscar todas as imagens e o nome da localidade
        cursor.execute("""
            SELECT 
                pagamento.id,
                pagamento.valor_pago,
                pagamento.comprovante_imagem,
                localidades.nome AS localidade_nome
            FROM 
                pagamento
            JOIN 
                localidades ON pagamento.localidade_id = localidades.id
            WHERE 
                comprovante_imagem IS NOT NULL;
        """)

        # Buscar todos os dados de imagem
        imagens = cursor.fetchall()

        # Verificar se existem imagens
        if imagens:
            return imagens  # Retorna todos os registros encontrados
        else:
            print("Nenhuma imagem encontrada no banco de dados.")
            return None

    except Exception as e:
        print("Erro ao conectar ao banco de dados:", e)
        return None
    finally:
        # Fechar conexão com o banco de dados
        cursor.close()
        con.close()

# Função para detectar e gerar os arquivos com prefixo
def decodificar_e_gerar_arquivo(binary_data, id_imagem, valor_pago, localidade_nome):
    try:
        # Decodificar de Base64 para binário
        binary_data = binascii.a2b_base64(binary_data)

        # Usar filetype para tentar detectar o tipo de arquivo
        kind = filetype.guess(binary_data)
        
        if kind is None:
            return {"error": f"Tipo de arquivo do ID {id_imagem} não detectado."}
        
        print(f"Tipo de arquivo do ID {id_imagem}: {kind.mime} | Localidade: {localidade_nome} | Valor: R$ {valor_pago}")

        # Prefixo para o front-end
        prefixo = f"comprovante_{id_imagem}"

        # Se for imagem PNG
        if kind.mime == 'image/png':
            image = Image.open(BytesIO(binary_data))
            output = BytesIO()
            image.save(output, format='PNG')
            output.seek(0)
            return send_file(output, mimetype='image/png', as_attachment=True, download_name=f"{prefixo}.png")

        # Se for imagem JPEG
        elif kind.mime == 'image/jpeg':
            image = Image.open(BytesIO(binary_data))
            output = BytesIO()
            image.save(output, format='JPEG')
            output.seek(0)
            return send_file(output, mimetype='image/jpeg', as_attachment=True, download_name=f"{prefixo}.jpeg")

        # Se for imagem WebP
        elif kind.mime == 'image/webp':
            image = Image.open(BytesIO(binary_data))
            output = BytesIO()
            image.save(output, format='WEBP')
            output.seek(0)
            return send_file(output, mimetype='image/webp', as_attachment=True, download_name=f"{prefixo}.webp")

        # Se for PDF
        elif kind.mime == 'application/pdf':
            output = BytesIO(binary_data)
            output.seek(0)
            return send_file(output, mimetype='application/pdf', as_attachment=True, download_name=f"{prefixo}.pdf")

        else:
            return {"error": f"Arquivo do ID {id_imagem} não é PNG, JPEG, WebP ou PDF."}

    except Exception as e:
        return {"error": f"Erro ao processar o arquivo do ID {id_imagem}: {e}"}

# Rota da API
@app.route('/api/comprovantes', methods=['GET'])
def get_comprovantes():
    try:
        # Buscar todas as imagens e arquivos PDF do banco de dados
        arquivos = buscar_imagens_do_banco()

        # Se houver arquivos, decodificar e retornar o arquivo
        if arquivos:
            # Para cada arquivo, decodificar e retornar com prefixo
            response_files = []
            for id_arquivo, valor_pago, binary_data, localidade_nome in arquivos:
                file_response = decodificar_e_gerar_arquivo(binary_data, id_arquivo, valor_pago, localidade_nome)
                if isinstance(file_response, dict):
                    return jsonify(file_response), 400
                response_files.append({
                    "id": id_arquivo,
                    "localidade": localidade_nome,
                    "valor_pago": valor_pago
                })
            return jsonify(response_files), 200
        else:
            return jsonify({"error": "Nenhuma imagem encontrada."}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Rodar a API
if __name__ == '__main__':
    app.run(debug=True)
