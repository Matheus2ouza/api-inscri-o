import binascii
import filetype  # Para detectar o tipo de arquivo
import base64

# Função para converter binário em Base64 com o prefixo adequado
def converter_para_base64(binary_data, file_type):
    if file_type == 'image/png':
        return 'data:image/png;base64,' + base64.b64encode(binary_data).decode('utf-8')
    elif file_type == 'image/jpeg':
        return 'data:image/jpeg;base64,' + base64.b64encode(binary_data).decode('utf-8')
    elif file_type == 'image/webp':
        return 'data:image/webp;base64,' + base64.b64encode(binary_data).decode('utf-8')
    elif file_type == 'application/pdf':
        return 'data:application/pdf;base64,' + base64.b64encode(binary_data).decode('utf-8')
    else:
        return None

# Função para decodificar os arquivos binários, adicionar o prefixo e retornar como Base64
def decodificar_e_retornar_arquivo(binary_data, id_imagem, valor_pago, localidade_nome):
    try:
        # Decodificar de hexadecimal (\x...) para binário
        if isinstance(binary_data, str) and binary_data.startswith("\\x"):
            binary_data = binascii.unhexlify(binary_data[2:])
        else:
            binary_data = binascii.a2b_base64(binary_data)

        # Usar filetype para tentar detectar o tipo de arquivo
        kind = filetype.guess(binary_data)
        
        if kind is None:
            print(f"Tipo de arquivo do ID {id_imagem} não detectado.")
            return None
        
        print(f"Tipo de arquivo do ID {id_imagem}: {kind.mime} | Localidade: {localidade_nome} | Valor: R$ {valor_pago}")

        # Converter para Base64 com o prefixo adequado
        base64_data = converter_para_base64(binary_data, kind.mime)
        
        if not base64_data:
            print(f"Arquivo do ID {id_imagem} não é suportado.")
            return None
        
        return {
            'id': id_imagem,
            'valor_pago': valor_pago,
            'localidade_nome': localidade_nome,
            'comprovante_imagem_base64': base64_data
        }
    
    except Exception as e:
        print(f"Erro ao decodificar ou processar o arquivo do ID {id_imagem}: {e}")
        return None

# Função principal para processar os dados recebidos do Node.js
def processar_dados(dados):
    result = []
    for item in dados:
        id_imagem = item.get('id')
        valor_pago = item.get('valor_pago')
        binary_data = item.get('comprovante_imagem')
        localidade_nome = item.get('localidade_nome')
        
        arquivo_processado = decodificar_e_retornar_arquivo(binary_data, id_imagem, valor_pago, localidade_nome)
        if arquivo_processado:
            result.append(arquivo_processado)
    
    return result

# Exemplo de como chamar a função com os dados recebidos do Node.js
if __name__ == "__main__":
    import sys
    import json

    # Ler dados enviados pelo Node.js como string JSON
    input_data = sys.stdin.read()
    
    try:
        # Parse do JSON recebido
        dados_recebidos = json.loads(input_data)
        
        # Processar os dados
        resultado = processar_dados(dados_recebidos)
        
        # Retornar o resultado como JSON
        print(json.dumps(resultado))
    except Exception as e:
        print(f"Erro ao processar os dados recebidos: {e}")
