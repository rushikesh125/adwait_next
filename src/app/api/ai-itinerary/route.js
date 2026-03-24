import { NextResponse } from "next/server"

export async function POST(request){
    try{
        const body = request.json()
    }catch(e){
        return NextResponse.json(e)    
    }
}